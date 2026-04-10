import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY!;
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID!;

function parseClickUpValue(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const cleaned = String(val).replace(/,/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function timestampToMonth(ts: string | number | null): string | null {
  if (!ts) return null;
  const d = new Date(Number(ts));
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function timestampToDate(ts: string | number | null): string | null {
  if (!ts) return null;
  const d = new Date(Number(ts));
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface ClickUpCustomField {
  name: string;
  type: string;
  value?: unknown;
  type_config?: {
    options?: Array<{ id: string; name: string; orderindex: number }>;
  };
}

interface ClickUpTask {
  id: string;
  date_done: string | null;
  custom_fields: ClickUpCustomField[];
}

// Busca o nome da opção selecionada num campo dropdown
function getDropdownOptionName(field: ClickUpCustomField | undefined): string | null {
  if (!field || field.value == null) return null;
  const options = field.type_config?.options ?? [];
  const selected = options.find(
    (o) => o.orderindex === Number(field.value) || String(o.id) === String(field.value)
  );
  return selected?.name ?? null;
}

function getCostCenter(fields: ClickUpCustomField[]): "ALURA" | "LATAM" {
  const field = fields.find((f) => f.name.includes("Centro de custo"));
  const name = getDropdownOptionName(field)?.toLowerCase() ?? "";
  return name === "latam" ? "LATAM" : "ALURA";
}

function isInvoiceUSD(fields: ClickUpCustomField[]): boolean {
  const field = fields.find((f) => f.name === "Tipo de prestador");
  return getDropdownOptionName(field) === "INVOICE/USD";
}

// Cache de câmbio por data (AAAA-MM-DD) para evitar chamadas repetidas no mesmo sync
const rateCache = new Map<string, number | null>();

async function fetchUsdToBrl(dateStr: string): Promise<number | null> {
  if (rateCache.has(dateStr)) return rateCache.get(dateStr)!;

  const d = dateStr.replace(/-/g, ""); // YYYYMMDD

  // 1ª tentativa: taxa específica da data (inclui dias úteis próximos se cair em feriado/fim de semana)
  try {
    const url = `https://economia.awesomeapi.com.br/json/daily/USD-BRL/1?start_date=${d}&end_date=${d}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      const rate = parseFloat(data?.[0]?.bid);
      if (!isNaN(rate)) { rateCache.set(dateStr, rate); return rate; }
    }
  } catch { /* segue para fallback */ }

  // 2ª tentativa: última taxa disponível (sempre funciona)
  try {
    const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL", {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      const rate = parseFloat(data?.["USDBRL"]?.bid);
      if (!isNaN(rate)) { rateCache.set(dateStr, rate); return rate; }
    }
  } catch { /* falhou */ }

  rateCache.set(dateStr, null);
  return null;
}

async function fetchAllTasks(): Promise<ClickUpTask[]> {
  const tasks: ClickUpTask[] = [];
  let page = 0;

  while (true) {
    const url = `https://api.clickup.com/api/v2/list/${CLICKUP_LIST_ID}/task?statuses[]=FINALIZADO&include_closed=false&page=${page}`;
    const res = await fetch(url, { headers: { Authorization: CLICKUP_API_KEY } });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ClickUp API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    tasks.push(...(data.tasks ?? []));

    if (data.last_page === true || !data.tasks?.length) break;
    page++;
  }

  return tasks;
}

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!CLICKUP_API_KEY || !CLICKUP_LIST_ID) {
    return NextResponse.json({ error: "Configuração do ClickUp ausente" }, { status: 500 });
  }

  try {
    rateCache.clear();
    const tasks = await fetchAllTasks();

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const task of tasks) {
      const month = timestampToMonth(task.date_done);
      if (!month) { skipped++; continue; }

      const date = timestampToDate(task.date_done);

      const valueField = task.custom_fields.find(
        (f) => f.name.includes("Valor total do contrato")
      ) ?? task.custom_fields.find(
        (f) => f.type === "number" && f.value !== null && f.value !== undefined
      );

      const value = parseClickUpValue(valueField?.value);
      if (!value) { skipped++; continue; }

      const instructorField = task.custom_fields.find(
        (f) => f.name === "Instrutor(a)" || f.name === "Instrutor"
      );
      const description = instructorField?.value
        ? String(instructorField.value).trim() || null
        : null;

      const costCenter = getCostCenter(task.custom_fields);

      // Detecta moeda — INVOICE/USD significa valor em dólar
      const usd = isInvoiceUSD(task.custom_fields);
      const currency = usd ? "USD" : "BRL";

      // Para entradas USD, busca a taxa de câmbio na data de conclusão
      let exchangeRate: number | null = null;
      if (usd && date) {
        exchangeRate = await fetchUsdToBrl(date);
      } else if (usd && month) {
        // Fallback: usa o primeiro dia do mês
        exchangeRate = await fetchUsdToBrl(`${month}-01`);
      }

      const existing = await prisma.expense.findUnique({
        where: { externalId: task.id },
      });

      if (existing) {
        await prisma.expense.update({
          where: { externalId: task.id },
          data: { month, date, value, description, costCenter, currency, exchangeRate },
        });
        updated++;
      } else {
        await prisma.expense.create({
          data: {
            month,
            date,
            value,
            description,
            category: "INSTRUTOR",
            source: "CLICKUP",
            externalId: task.id,
            costCenter,
            currency,
            exchangeRate,
          },
        });
        inserted++;
      }
    }

    return NextResponse.json({
      success: true,
      total: tasks.length,
      inserted,
      updated,
      skipped,
    });
  } catch (err) {
    console.error("[ClickUp sync]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}
