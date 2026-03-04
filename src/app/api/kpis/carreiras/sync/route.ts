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

  // Extrai links /carreiras/slug da página de listagem
  const linkRe = /href="\/carreiras\/([\w-]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const slug = m[1];
    // Ignora slugs que parecem ser de outra coisa (e.g., âncoras, etc.)
    if (seen.has(slug)) continue;
    seen.add(slug);
    careers.push({ slug, name: "" });
  }

  // Tenta extrair o nome visível associado a cada slug
  // Pattern: <a href="/carreiras/slug"...>...texto...</a>
  const namedRe = /href="\/carreiras\/([\w-]+)"[^>]*>([^<]{3,80})<\/a>/g;
  const nameMap = new Map<string, string>();
  while ((m = namedRe.exec(html)) !== null) {
    const slug = m[1];
    const text = m[2].trim();
    if (text && !nameMap.has(slug)) {
      nameMap.set(slug, text);
    }
  }

  return careers.map((c) => ({
    slug: c.slug,
    name: nameMap.get(c.slug) ?? slugToName(c.slug),
  }));
}

function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function extractLevels(html: string): LevelInfo[] {
  const levels: LevelInfo[] = [];
  // Captura conteúdo de headings h3-h6
  const headingRe = /<h[3-6][^>]*>([\s\S]*?)<\/h[3-6]>/gi;
  let m: RegExpExecArray | null;

  while ((m = headingRe.exec(html)) !== null) {
    // Remove tags internas (spans, etc.)
    const text = m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

    // Filtra apenas headings que parecem ser níveis de carreira
    const isLevel =
      /\bbase\b/i.test(text) ||
      /\bn[ií]vel\s+\d/i.test(text) ||
      /\[em\s+breve\]/i.test(text);

    if (!isLevel || text.length < 4) continue;

    const isComingSoon = /\[em\s+breve\]/i.test(text);
    const levelName = text.replace(/\[em\s+breve\]\s*/i, "").trim();

    if (levelName) {
      levels.push({ levelName, isPublished: !isComingSoon });
    }
  }

  return levels;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
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
        return { career, levels: extractLevels(html) };
      })
    );

    // 3. Processa resultados e faz upsert no DB
    const now = new Date();
    let totalNiveis = 0;
    let newPublished = 0;

    for (const result of results) {
      if (result.status === "rejected") continue;
      const { career, levels } = result.value;

      for (const level of levels) {
        totalNiveis++;

        // Busca registro existente
        const existing = await prisma.kpiCarreiraLevel.findUnique({
          where: { carreiraSlug_levelName: { carreiraSlug: career.slug, levelName: level.levelName } },
        });

        if (!existing) {
          // Primeiro sync deste nível
          await prisma.kpiCarreiraLevel.create({
            data: {
              carreiraSlug: career.slug,
              carreiraName: career.name,
              levelName: level.levelName,
              isPublished: level.isPublished,
              firstPublishedAt: level.isPublished ? now : null,
            },
          });
          if (level.isPublished) newPublished++;
        } else {
          // Atualiza: se recém publicado, registra data
          const justPublished = !existing.isPublished && level.isPublished;
          await prisma.kpiCarreiraLevel.update({
            where: { id: existing.id },
            data: {
              isPublished: level.isPublished,
              carreiraName: career.name, // atualiza nome caso mude
              firstPublishedAt: justPublished ? now : existing.firstPublishedAt,
            },
          });
          if (justPublished) newPublished++;
        }
      }
    }

    // 4. Retorna todos os níveis atualizados
    const allLevels = await prisma.kpiCarreiraLevel.findMany({
      orderBy: [{ carreiraName: "asc" }, { levelName: "asc" }],
    });

    return NextResponse.json({
      success: true,
      syncedAt: now,
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
    orderBy: [{ carreiraName: "asc" }, { levelName: "asc" }],
  });

  return NextResponse.json(levels);
}
