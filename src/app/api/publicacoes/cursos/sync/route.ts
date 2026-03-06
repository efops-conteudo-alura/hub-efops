import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const BATCH_SIZE = 15;

interface InstructorRaw {
  nome?: string;
  name?: string;
  [key: string]: unknown;
}

interface CategoriaRaw {
  nome?: string;
  slug?: string;
  [key: string]: unknown;
}

interface CourseApiResponse {
  slug?: string;
  nome?: string;
  metadescription?: string;
  categoria?: CategoriaRaw;
  subcategoria?: CategoriaRaw;
  instrutores?: InstructorRaw[];
  carga_horaria?: number | string;
  data_criacao?: string | number;
  data_atualizacao?: string | number;
  [key: string]: unknown;
}

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  // Alura timestamps can be Unix seconds (number) or ISO string
  if (typeof val === "number") return new Date(val * 1000);
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  try {
    // 1. Fetch listing page
    const listRes = await fetch("https://www.alura.com.br/cursos-online-tecnologia", {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!listRes.ok) {
      return NextResponse.json({ error: "Falha ao buscar página de cursos Alura" }, { status: 502 });
    }
    const html = await listRes.text();

    // 2. Extract slugs from hrefs like /curso-online-{slug}
    const slugMatches = [...html.matchAll(/href="\/curso-online-([\w-]+)"/g)];
    const slugs = [...new Set(slugMatches.map((m) => m[1]))];

    if (slugs.length === 0) {
      return NextResponse.json({ error: "Nenhum curso encontrado na página. A estrutura HTML pode ter mudado." }, { status: 500 });
    }

    // 3. Batch fetch course APIs
    const courses: CourseApiResponse[] = [];

    for (let i = 0; i < slugs.length; i += BATCH_SIZE) {
      const batch = slugs.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((slug) =>
          fetch(`https://cursos.alura.com.br/api/curso-${slug}`, {
            headers: { "User-Agent": USER_AGENT },
          }).then((r) => {
            if (!r.ok) return null;
            return r.json() as Promise<CourseApiResponse>;
          })
        )
      );
      for (const result of batchResults) {
        if (result.status === "fulfilled" && result.value) {
          courses.push(result.value);
        }
      }
    }

    // 4. Upsert each course
    let upserted = 0;
    let skipped = 0;

    for (const course of courses) {
      const slug = course.slug;
      if (!slug || !course.nome) { skipped++; continue; }

      const instrutores = (course.instrutores ?? [])
        .map((i) => i.nome ?? i.name ?? "")
        .filter(Boolean);

      const categoria = course.subcategoria?.nome ?? course.categoria?.nome ?? null;
      const subcategoria = course.subcategoria?.nome ?? null;

      const cargaHorariaRaw = course.carga_horaria;
      const cargaHoraria =
        cargaHorariaRaw != null ? Math.round(Number(cargaHorariaRaw)) || null : null;

      const dataCriacao = parseDate(course.data_criacao);
      const dataAtualizacao = parseDate(course.data_atualizacao);

      await prisma.aluraCourse.upsert({
        where: { slug },
        create: {
          slug,
          nome: course.nome,
          metadescription: course.metadescription ?? null,
          categoria,
          subcategoria,
          instrutores,
          cargaHoraria,
          dataCriacao,
          dataAtualizacao,
        },
        update: {
          nome: course.nome,
          metadescription: course.metadescription ?? null,
          categoria,
          subcategoria,
          instrutores,
          cargaHoraria,
          dataCriacao,
          dataAtualizacao,
        },
      });
      upserted++;
    }

    return NextResponse.json({
      success: true,
      slugsFound: slugs.length,
      coursesProcessed: upserted,
      skipped,
    });
  } catch (err) {
    console.error("[publicacoes/cursos/sync] Erro:", err);
    return NextResponse.json({ error: "Erro interno ao sincronizar" }, { status: 500 });
  }
}
