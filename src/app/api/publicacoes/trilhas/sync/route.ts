import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const BATCH_SIZE = 15;

interface FormacaoApiResponse {
  code?: string;
  title?: string;
  estimatedTimeToFinish?: number;
  totalPublishedCourses?: number;
  categoryName?: string;
  [key: string]: unknown;
}

async function fetchSlugsFromFormacoes(): Promise<string[]> {
  try {
    const res = await fetch("https://www.alura.com.br/formacoes", {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return [];
    const html = await res.text();
    // hrefs no formato /formacao-slug-name
    const matches = [...html.matchAll(/href="\/formacao-([\w-]+)"/g)];
    return [...new Set(matches.map((m) => m[1]))];
  } catch {
    return [];
  }
}

async function fetchFormacaoApi(slug: string): Promise<FormacaoApiResponse | null> {
  try {
    const res = await fetch(`https://cursos.alura.com.br/api/formacao-${slug}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  try {
    // 1. Fetch listing page → slugs
    const slugs = await fetchSlugsFromFormacoes();
    if (slugs.length === 0) {
      return NextResponse.json({ error: "Nenhuma trilha encontrada. A estrutura HTML pode ter mudado." }, { status: 500 });
    }

    // 2. Buscar API para todos os slugs
    const formacaoData = new Map<string, FormacaoApiResponse>();
    for (let i = 0; i < slugs.length; i += BATCH_SIZE) {
      const batch = slugs.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (slug) => ({ slug, data: await fetchFormacaoApi(slug) }))
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.data) {
          formacaoData.set(r.value.slug, r.value.data);
        }
      }
    }

    // 3. Upsert
    let upserted = 0;
    for (const slug of slugs) {
      const data = formacaoData.get(slug);
      if (!data) continue;

      await prisma.aluraTrilha.upsert({
        where: { slug },
        create: {
          slug,
          nome: data.title ?? slug,
          categoria: data.categoryName ?? null,
          numCursos: data.totalPublishedCourses != null ? Number(data.totalPublishedCourses) : null,
          cargaHoraria: data.estimatedTimeToFinish != null ? Math.round(Number(data.estimatedTimeToFinish)) : null,
        },
        update: {
          nome: data.title ?? slug,
          categoria: data.categoryName ?? null,
          numCursos: data.totalPublishedCourses != null ? Number(data.totalPublishedCourses) : null,
          cargaHoraria: data.estimatedTimeToFinish != null ? Math.round(Number(data.estimatedTimeToFinish)) : null,
        },
      });
      upserted++;
    }

    const trilhas = await prisma.aluraTrilha.findMany({
      orderBy: { nome: "asc" },
      select: {
        id: true,
        slug: true,
        nome: true,
        categoria: true,
        numCursos: true,
        cargaHoraria: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      slugsFound: slugs.length,
      newTrilhasProcessed: upserted,
      syncedAt: new Date().toISOString(),
      trilhas,
    });
  } catch (err) {
    console.error("[publicacoes/trilhas/sync] Erro:", err);
    return NextResponse.json({ error: "Erro interno ao sincronizar" }, { status: 500 });
  }
}
