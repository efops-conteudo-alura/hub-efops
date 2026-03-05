import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface CareerInfo {
  slug: string;
  name: string;
}

interface LevelInfo {
  levelName: string;
  isPublished: boolean;
}

function extractCareers(html: string): CareerInfo[] {
  const seen = new Set<string>();
  const careers: CareerInfo[] = [];

  const linkRe = /href="\/carreiras\/([\w-]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const slug = m[1];
    if (seen.has(slug)) continue;
    seen.add(slug);
    careers.push({ slug, name: slugToName(slug) });
  }

  return careers;
}

// Extrai o nome da carreira a partir do h1 da página individual
function extractCareerName(html: string): string | null {
  const m = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  if (!m) return null;
  const text = m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return text.length >= 3 ? text : null;
}

function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function extractLevels(html: string): LevelInfo[] {
  const levels: LevelInfo[] = [];
  const headingRe = /<h[3-6][^>]*>([\s\S]*?)<\/h[3-6]>/gi;
  let m: RegExpExecArray | null;

  while ((m = headingRe.exec(html)) !== null) {
    const raw = m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

    const isComingSoon = /\[em\s+breve\]/i.test(raw);
    const levelName = raw.replace(/\[em\s+breve\]\s*/i, "").trim();

    // Só captura headings que COMEÇAM com "Base" ou "Nível X"
    // "base" no meio de uma frase (ex: "construindo a base") não conta
    const isLevel =
      /^\s*base\b/i.test(levelName) ||
      /^\s*n[ií]vel\s+\d/i.test(levelName);

    if (!isLevel || levelName.length < 4) continue;

    levels.push({ levelName, isPublished: !isComingSoon });
  }

  return levels;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 0. Lê previousSyncAt antes de atualizar
    const pesos = await prisma.kpiPesos.findFirst();
    const previousSyncAt = pesos?.lastSyncAt ?? null;

    // 1. Busca a página de listagem de carreiras
    const listingRes = await fetch("https://www.alura.com.br/carreiras", {
      headers: { "User-Agent": UA },
    });
    if (!listingRes.ok) {
      return NextResponse.json({ error: `Falha ao buscar listagem: ${listingRes.status}` }, { status: 502 });
    }
    const listingHtml = await listingRes.text();
    const careers = extractCareers(listingHtml);

    if (careers.length === 0) {
      return NextResponse.json({ error: "Nenhuma carreira encontrada na página de listagem" }, { status: 502 });
    }

    // 2. Busca todas as páginas de carreira em paralelo
    const results = await Promise.allSettled(
      careers.map(async (career) => {
        const res = await fetch(`https://www.alura.com.br/carreiras/${career.slug}`, {
          headers: { "User-Agent": UA },
        });
        if (!res.ok) return { career, levels: [] as LevelInfo[] };
        const html = await res.text();
        // Usa o h1 da página como nome — mais confiável que o texto do link na listagem
        const pageName = extractCareerName(html);
        return {
          career: { ...career, name: pageName || career.name },
          levels: extractLevels(html),
        };
      })
    );

    // 3. Processa resultados e faz upsert no DB
    const now = new Date();
    let totalNiveis = 0;
    let newPublished = 0;
    const processedKeys = new Set<string>(); // rastreia o que foi encontrado neste sync

    for (const result of results) {
      if (result.status === "rejected") continue;
      const { career, levels } = result.value;

      for (let idx = 0; idx < levels.length; idx++) {
        const level = levels[idx];
        totalNiveis++;
        processedKeys.add(`${career.slug}::${level.levelName}`);

        const existing = await prisma.kpiCarreiraLevel.findUnique({
          where: { carreiraSlug_levelName: { carreiraSlug: career.slug, levelName: level.levelName } },
        });

        if (!existing) {
          await prisma.kpiCarreiraLevel.create({
            data: {
              carreiraSlug: career.slug,
              carreiraName: career.name,
              levelName: level.levelName,
              order: idx,
              isPublished: level.isPublished,
              firstPublishedAt: level.isPublished ? now : null,
            },
          });
          if (level.isPublished) newPublished++;
        } else {
          const justPublished = !existing.isPublished && level.isPublished;
          await prisma.kpiCarreiraLevel.update({
            where: { id: existing.id },
            data: {
              isPublished: level.isPublished,
              carreiraName: career.name,
              order: idx,
              firstPublishedAt: justPublished ? now : existing.firstPublishedAt,
            },
          });
          if (justPublished) newPublished++;
        }
      }
    }

    // 3b. Remove registros que já não aparecem no site (cursos/itens capturados por engano antes)
    const allExisting = await prisma.kpiCarreiraLevel.findMany({ select: { id: true, carreiraSlug: true, levelName: true } });
    const toDelete = allExisting.filter((r) => !processedKeys.has(`${r.carreiraSlug}::${r.levelName}`));
    if (toDelete.length > 0) {
      await prisma.kpiCarreiraLevel.deleteMany({ where: { id: { in: toDelete.map((r) => r.id) } } });
    }

    // 4. Atualiza lastSyncAt no KpiPesos
    if (pesos) {
      await prisma.kpiPesos.update({ where: { id: pesos.id }, data: { lastSyncAt: now } });
    } else {
      await prisma.kpiPesos.create({ data: { lastSyncAt: now } });
    }

    // 5. Retorna todos os níveis ordenados por carreira + posição no site
    const allLevels = await prisma.kpiCarreiraLevel.findMany({
      orderBy: [{ carreiraName: "asc" }, { order: "asc" }],
    });

    return NextResponse.json({
      success: true,
      syncedAt: now,
      previousSyncAt,
      careersProcessed: careers.length,
      levelsProcessed: totalNiveis,
      newPublished,
      levels: allLevels,
    });
  } catch (err) {
    console.error("[Carreiras sync]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const levels = await prisma.kpiCarreiraLevel.findMany({
    orderBy: [{ carreiraName: "asc" }, { order: "asc" }],
  });

  return NextResponse.json(levels);
}
