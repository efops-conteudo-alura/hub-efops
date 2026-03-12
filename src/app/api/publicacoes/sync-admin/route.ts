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

// Caelum BI retorna linhas como arrays de valores (não objetos)
// Ordem: [aluraId, slug, nome, dataPublicacao, statusPub, statusCriacao, tipoContrato, isExclusive, catalogos]
type BiRow = string[];

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
  // [5]=statusCriacao [6]=tipoContrato [7]=isExclusive [8]=catalogos
  const parsed = rows.flatMap((row) => {
    const slug = row[1];
    if (!slug) return [];
    const catalogos = (row[8] ?? "")
      .split(", ")
      .map((c) => c.trim())
      .filter((c) => c && !c.toLowerCase().includes("teste") && !c.toLowerCase().includes("trial"));
    return [{
      slug,
      data: {
        nome: row[2] || slug,
        aluraId: row[0] ? Number(row[0]) : null,
        statusPub: row[4] || null,
        statusCriacao: row[5] || null,
        tipoContrato: row[6] || null,
        catalogos,
        isExclusive: row[7] === "1" || row[7] === "true",
        dataPublicacao: row[3] ? new Date(row[3]) : null,
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
    await Promise.allSettled(
      batch.map(({ slug, data }) =>
        prisma.aluraCourse.upsert({
          where: { slug },
          create: { slug, ...data },
          update: data,
        })
      )
    );
    for (const { slug } of batch) {
      if (existingSlugs.has(slug)) updated++;
      else created++;
    }
  }

  return NextResponse.json({ created, updated, total: created + updated });
}
