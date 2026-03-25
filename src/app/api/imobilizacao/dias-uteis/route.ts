import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

interface FeriadoBrasil {
  date: string;
  name: string;
  type: string;
}

function contarDiasUteis(
  dataInicio: Date,
  dataFim: Date,
  feriadosDatas: Set<string>
): number {
  let count = 0;
  const cur = new Date(dataInicio);
  cur.setHours(0, 0, 0, 0);
  const fim = new Date(dataFim);
  fim.setHours(0, 0, 0, 0);

  while (cur <= fim) {
    const dow = cur.getDay();
    const iso = cur.toISOString().slice(0, 10); // YYYY-MM-DD
    if (dow !== 0 && dow !== 6 && !feriadosDatas.has(iso)) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const ano = searchParams.get("ano");
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");

  if (!ano || !dataInicio || !dataFim) {
    return NextResponse.json(
      { error: "Parâmetros obrigatórios: ano, dataInicio, dataFim" },
      { status: 400 }
    );
  }

  // Busca feriados nacionais via BrasilAPI
  let feriadosBrasil: FeriadoBrasil[] = [];
  try {
    const res = await fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`, {
      next: { revalidate: 86400 }, // cache por 24h
    });
    if (res.ok) {
      feriadosBrasil = await res.json();
    }
  } catch {
    // Se a API falhar, segue sem feriados nacionais
  }

  const feriadosDatas = new Set(feriadosBrasil.map((f) => f.date));

  const inicio = new Date(dataInicio + "T00:00:00");
  const fim = new Date(dataFim + "T00:00:00");

  if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
    return NextResponse.json({ error: "Datas inválidas" }, { status: 400 });
  }

  // Conta quantos feriados nacionais caem em dias úteis no intervalo
  const feriadosNoPeriodo = feriadosBrasil.filter((f) => {
    const d = new Date(f.date + "T00:00:00");
    const dow = d.getDay();
    return d >= inicio && d <= fim && dow !== 0 && dow !== 6;
  });

  const diasUteis = contarDiasUteis(inicio, fim, feriadosDatas);

  return NextResponse.json({
    diasUteis,
    feriados: feriadosNoPeriodo.length,
    feriados_detalhados: feriadosNoPeriodo.map((f) => ({ data: f.date, nome: f.name })),
  });
}
