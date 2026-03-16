import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { NextResponse } from "next/server";

async function getConfigValue(key: string): Promise<string> {
  const config = await prisma.systemConfig.findUnique({ where: { key } });
  if (config?.value) return decrypt(config.value);
  return process.env[key] ?? "";
}

// Caelum BI retorna linhas como arrays ou objetos com chaves nomeadas
type BiRow = string[] | Record<string, string>;

function col(row: BiRow, index: number, key: string): string {
  if (Array.isArray(row)) return row[index] ?? "";
  return row[key] ?? row[index] ?? "";
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const biUrl = await getConfigValue("CAELUM_BI_URL");
  if (!biUrl) {
    return NextResponse.json(
      { error: "URL do Caelum BI não configurada. Acesse Admin → Configurações." },
      { status: 500 }
    );
  }

  let rows: BiRow[];
  try {
    const fetchUrl = biUrl.includes("?") ? `${biUrl}&format=json` : `${biUrl}?format=json`;
    const res = await fetch(fetchUrl, { headers: { "Cache-Control": "no-cache" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    console.log("[sync-admin] Caelum BI raw type:", typeof raw, Array.isArray(raw) ? `array[${raw.length}]` : JSON.stringify(raw).slice(0, 200));
    // Suporta array direto ou wrapped em { data, rows, results }
    if (Array.isArray(raw)) {
      rows = raw;
    } else if (Array.isArray(raw?.data)) {
      rows = raw.data;
    } else if (Array.isArray(raw?.rows)) {
      rows = raw.rows;
    } else if (Array.isArray(raw?.results)) {
      rows = raw.results;
    } else if (Array.isArray(raw?.result)) {
      rows = raw.result;
    } else {
      return NextResponse.json({ error: `Formato inesperado do Caelum BI: ${JSON.stringify(raw).slice(0, 200)}` }, { status: 500 });
    }
  } catch (err) {
    console.error("[sync-admin] Erro ao buscar Caelum BI:", err);
    return NextResponse.json({ error: "Erro ao buscar dados do Caelum BI" }, { status: 500 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "Nenhum curso retornado pelo Caelum BI" }, { status: 500 });
  }

  // 1. Parse tudo em memória (zero DB)
  // [0]=aluraId [1]=slug [2]=nome [3]=dataPublicacao [4]=statusPub
  // [5]=statusCriacao [6]=tipoContrato [7]=isExclusive [8]=catalogos [9]=subcategorias [10]=categoria [11]=instrutores
  const parsed = rows.flatMap((row) => {
    const slug = col(row, 1, "slug");
    if (!slug) return [];
    const catalogos = (col(row, 8, "catalogos") ?? "")
      .split(", ")
      .map((c) => c.trim())
      .filter((c) => c && !c.toLowerCase().includes("teste") && !c.toLowerCase().includes("trial"));
    const subcategorias = col(row, 9, "subcategorias") || null;
    const categoria = col(row, 10, "categoria") || null;
    const instrutores = (col(row, 11, "instrutores") || "")
      .split(", ")
      .map((i) => i.trim())
      .filter(Boolean);
    return [{
      slug,
      data: {
        nome: col(row, 2, "nome") || slug,
        aluraId: col(row, 0, "aluraId") ? Number(col(row, 0, "aluraId")) : null,
        statusPub: col(row, 4, "statusPub") || null,
        statusCriacao: col(row, 5, "statusCriacao") || null,
        tipoContrato: col(row, 6, "tipoContrato") || null,
        catalogos,
        isExclusive: col(row, 7, "isExclusive") === "1" || col(row, 7, "isExclusive") === "true",
        dataPublicacao: col(row, 3, "dataPublicacao") ? new Date(col(row, 3, "dataPublicacao")) : null,
        subcategorias,
        categoria,
        instrutores,
      },
    }];
  });

  // 2. Uma query para saber quais slugs já existem
  const existingSlugs = new Set(
    (await prisma.aluraCourse.findMany({
      where: { slug: { in: parsed.map((p) => p.slug) } },
      select: { slug: true },
    })).map((c) => c.slug)
  );

  // 3. Upserts em batches de 20 em paralelo
  const BATCH = 20;
  let created = 0;
  let updated = 0;

  for (let i = 0; i < parsed.length; i += BATCH) {
    const batch = parsed.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(({ slug, data }) =>
        prisma.aluraCourse.upsert({
          where: { slug },
          create: { slug, ...data },
          update: data,
        }).then(() => slug)
      )
    );
    for (const r of results) {
      if (r.status === "fulfilled") {
        if (existingSlugs.has(r.value)) updated++;
        else created++;
      }
    }
  }

  return NextResponse.json({ created, updated, total: created + updated });
}
