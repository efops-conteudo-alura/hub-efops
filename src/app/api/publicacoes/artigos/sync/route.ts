import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const BATCH_SIZE = 10;

const CATEGORY_SOURCES = [
  { label: "Programação", url: "https://www.alura.com.br/artigos/programacao" },
  { label: "Front-end", url: "https://www.alura.com.br/artigos/front-end" },
  { label: "Data Science", url: "https://www.alura.com.br/artigos/data-science" },
  { label: "Inteligência Artificial", url: "https://www.alura.com.br/artigos/inteligencia-artificial" },
  { label: "DevOps", url: "https://www.alura.com.br/artigos/devops" },
  { label: "UX & Design", url: "https://www.alura.com.br/artigos/ux-design" },
  { label: "Mobile", url: "https://www.alura.com.br/artigos/mobile" },
  { label: "Inovação & Gestão", url: "https://www.alura.com.br/artigos/inovacao-gestao" },
];

// slugs que são páginas de categoria, não artigos
const CATEGORY_SLUGS = new Set([
  "programacao", "front-end", "data-science", "inteligencia-artificial",
  "devops", "ux-design", "mobile", "inovacao-gestao",
]);

async function fetchSlugsForCategory(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return [];
    const html = await res.text();
    const matches = [...html.matchAll(/href="\/artigos\/([\w-]+)"/g)];
    return [...new Set(
      matches.map((m) => m[1]).filter((slug) => !CATEGORY_SLUGS.has(slug))
    )];
  } catch {
    return [];
  }
}

interface JsonLdBlogPosting {
  "@type"?: string;
  headline?: string;
  description?: string;
  datePublished?: string;
  dateModified?: string;
  author?: { name?: string } | { name?: string }[];
}

async function fetchArtigoData(slug: string): Promise<{
  nome: string | null;
  descricao: string | null;
  autor: string | null;
  dataPublicacao: Date | null;
  dataModificacao: Date | null;
} | null> {
  try {
    const res = await fetch(`https://www.alura.com.br/artigos/${slug}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extrair JSON-LD
    const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
    if (!ldMatch) return null;

    for (const block of ldMatch) {
      try {
        const json: JsonLdBlogPosting = JSON.parse(
          block.replace(/<script[^>]*>/, "").replace(/<\/script>/, "")
        );
        if (json["@type"] === "BlogPosting" || json.datePublished) {
          const authorRaw = json.author;
          const autor = Array.isArray(authorRaw)
            ? authorRaw.map((a) => a.name).filter(Boolean).join(", ")
            : authorRaw?.name ?? null;

          return {
            nome: json.headline ?? null,
            descricao: json.description ?? null,
            autor: autor ?? null,
            dataPublicacao: json.datePublished ? new Date(json.datePublished) : null,
            dataModificacao: json.dateModified ? new Date(json.dateModified) : null,
          };
        }
      } catch {
        // próximo bloco
      }
    }
    return null;
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
    // 1. Fetch all category pages in parallel → slug → label
    const categoryResults = await Promise.allSettled(
      CATEGORY_SOURCES.map(async (src) => ({
        label: src.label,
        slugs: await fetchSlugsForCategory(src.url),
      }))
    );

    const slugCategoryMap = new Map<string, string>();
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
      return NextResponse.json({ error: "Nenhum artigo encontrado." }, { status: 500 });
    }

    // 2. Identificar artigos já completos no DB
    const existing = await prisma.aluraArtigo.findMany({
      where: { slug: { in: allSlugs } },
      select: { slug: true, dataPublicacao: true },
    });
    const existingComplete = new Set(
      existing.filter((a) => a.dataPublicacao !== null).map((a) => a.slug)
    );

    // 3. Buscar dados apenas dos novos/incompletos
    const newSlugs = allSlugs.filter((s) => !existingComplete.has(s));
    const artigoData = new Map<string, Awaited<ReturnType<typeof fetchArtigoData>>>();

    for (let i = 0; i < newSlugs.length; i += BATCH_SIZE) {
      const batch = newSlugs.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (slug) => ({ slug, data: await fetchArtigoData(slug) }))
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          artigoData.set(r.value.slug, r.value.data);
        }
      }
    }

    // 4. Upsert
    let upserted = 0;
    let categoryUpdated = 0;

    for (const [slug, categoria] of slugCategoryMap) {
      const data = artigoData.get(slug);

      if (data) {
        await prisma.aluraArtigo.upsert({
          where: { slug },
          create: {
            slug,
            nome: data.nome ?? slug,
            descricao: data.descricao,
            autor: data.autor,
            categoria,
            dataPublicacao: data.dataPublicacao,
            dataModificacao: data.dataModificacao,
          },
          update: {
            nome: data.nome ?? slug,
            descricao: data.descricao,
            autor: data.autor,
            categoria,
            dataPublicacao: data.dataPublicacao,
            dataModificacao: data.dataModificacao,
          },
        });
        upserted++;
      } else if (existingComplete.has(slug)) {
        await prisma.aluraArtigo.update({
          where: { slug },
          data: { categoria },
        });
        categoryUpdated++;
      }
    }

    return NextResponse.json({
      success: true,
      slugsFound: allSlugs.length,
      newArtigosProcessed: upserted,
      existingUpdated: categoryUpdated,
    });
  } catch (err) {
    console.error("[publicacoes/artigos/sync] Erro:", err);
    return NextResponse.json({ error: "Erro interno ao sincronizar" }, { status: 500 });
  }
}
