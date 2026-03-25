import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const BATCH_SIZE = 15;

// Uma URL de listagem por categoria — assim o label fica correto desde o início
const CATEGORY_SOURCES = [
  { label: "Programação", url: "https://www.alura.com.br/cursos-online-programacao" },
  { label: "Front-end", url: "https://www.alura.com.br/cursos-online-front-end" },
  { label: "Data Science", url: "https://www.alura.com.br/cursos-online-data-science" },
  { label: "Inteligência Artificial", url: "https://www.alura.com.br/cursos-online-inteligencia-artificial" },
  { label: "DevOps", url: "https://www.alura.com.br/cursos-online-devops" },
  { label: "UX & Design", url: "https://www.alura.com.br/cursos-online-design-ux" },
  { label: "Mobile", url: "https://www.alura.com.br/cursos-online-mobile" },
  { label: "Inovação & Gestão", url: "https://www.alura.com.br/cursos-online-inovacao-gestao" },
];

interface InstructorRaw {
  nome?: string;
  name?: string;
  [key: string]: unknown;
}

interface CourseApiResponse {
  slug?: string;
  nome?: string;
  metadescription?: string;
  instrutores?: InstructorRaw[];
  carga_horaria?: number | string;
  data_criacao?: string | number;
  data_atualizacao?: string | number;
  [key: string]: unknown;
}

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (typeof val === "number") return new Date(val * 1000);
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

async function fetchSlugsForCategory(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return [];
    const html = await res.text();
    const matches = [...html.matchAll(/href="\/curso-online-([\w-]+)"/g)];
    return [...new Set(matches.map((m) => m[1]))];
  } catch {
    return [];
  }
}

async function fetchCourseApi(slug: string): Promise<CourseApiResponse | null> {
  try {
    const res = await fetch(`https://cursos.alura.com.br/api/curso-${slug}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  try {
    // 1. Fetch all 8 category listing pages in parallel → slug → label
    const categoryResults = await Promise.allSettled(
      CATEGORY_SOURCES.map(async (src) => ({
        label: src.label,
        slugs: await fetchSlugsForCategory(src.url),
      }))
    );

    const slugCategoryMap = new Map<string, string>(); // slug → label
    for (const result of categoryResults) {
      if (result.status === "fulfilled") {
        const { label, slugs } = result.value;
        for (const slug of slugs) {
          if (!slugCategoryMap.has(slug)) slugCategoryMap.set(slug, label);
        }
      }
    }

    const allSlugs = [...slugCategoryMap.keys()];
    if (allSlugs.length === 0) {
      return NextResponse.json({ error: "Nenhum curso encontrado nas páginas de categoria. A estrutura HTML pode ter mudado." }, { status: 500 });
    }

    // 2. Find which slugs already have full data in DB (dataCriacao preenchida)
    const existing = await prisma.aluraCourse.findMany({
      where: { slug: { in: allSlugs } },
      select: { slug: true, dataPublicacao: true },
    });
    const existingComplete = new Set(
      existing.filter((c) => c.dataPublicacao !== null).map((c) => c.slug)
    );

    // 3. Fetch individual course APIs only for new/incomplete courses
    const newSlugs = allSlugs.filter((s) => !existingComplete.has(s));
    const courseApiData = new Map<string, CourseApiResponse>();

    for (let i = 0; i < newSlugs.length; i += BATCH_SIZE) {
      const batch = newSlugs.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (slug) => ({ slug, data: await fetchCourseApi(slug) }))
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.data) {
          courseApiData.set(r.value.slug, r.value.data);
        }
      }
    }

    // 4. Upsert all courses
    let upserted = 0;
    let categoryUpdated = 0;

    for (const [slug, categoria] of slugCategoryMap) {
      const apiData = courseApiData.get(slug);

      if (apiData) {
        // New/incomplete course — full upsert with API data
        const instrutores = (apiData.instrutores ?? [])
          .map((i) => i.nome ?? i.name ?? "")
          .filter(Boolean);
        const cargaHoraria =
          apiData.carga_horaria != null ? Math.round(Number(apiData.carga_horaria)) || null : null;

        await prisma.aluraCourse.upsert({
          where: { slug },
          create: {
            slug,
            nome: apiData.nome ?? slug,
            metadescription: apiData.metadescription ?? null,
            categoria,
            subcategoria: null,
            instrutores,
            cargaHoraria,
            dataPublicacao: parseDate(apiData.data_criacao),
          },
          update: {
            nome: apiData.nome ?? slug,
            metadescription: apiData.metadescription ?? null,
            categoria,
            instrutores,
            cargaHoraria,
            dataPublicacao: parseDate(apiData.data_criacao),
          },
        });
        upserted++;
      } else if (existingComplete.has(slug)) {
        // Already complete — just update category label if needed
        await prisma.aluraCourse.update({
          where: { slug },
          data: { categoria },
        });
        categoryUpdated++;
      }
      // If apiData is null AND not in existingComplete → API failed, skip for now
    }

    return NextResponse.json({
      success: true,
      slugsFound: allSlugs.length,
      newCoursesProcessed: upserted,
      existingUpdated: categoryUpdated,
    });
  } catch (err) {
    console.error("[publicacoes/cursos/sync] Erro:", err);
    return NextResponse.json({ error: "Erro interno ao sincronizar" }, { status: 500 });
  }
}
