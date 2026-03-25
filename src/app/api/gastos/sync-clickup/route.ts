import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const CLICKUP_API_KEY = process.env.CLICKUP_API_KEY!;
const CLICKUP_LIST_ID = process.env.CLICKUP_LIST_ID!;

function parseClickUpValue(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  // Remove vírgulas usadas como separador de milhar no formato americano
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
}

interface ClickUpTask {
  id: string;
  date_done: string | null;
  custom_fields: ClickUpCustomField[];
}

async function fetchAllTasks(): Promise<ClickUpTask[]> {
  const tasks: ClickUpTask[] = [];
  let page = 0;

  while (true) {
    const url = `https://api.clickup.com/api/v2/list/${CLICKUP_LIST_ID}/task?statuses[]=FINALIZADO&include_closed=false&page=${page}`;
    const res = await fetch(url, {
      headers: { Authorization: CLICKUP_API_KEY },
    });

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
    const tasks = await fetchAllTasks();

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const task of tasks) {
      const month = timestampToMonth(task.date_done);
      if (!month) { skipped++; continue; }

      const date = timestampToDate(task.date_done);

      // Valor total do contrato — por nome exato, ou fallback pelo primeiro campo numérico com valor
      const valueField = task.custom_fields.find(
        (f) => f.name === "Valor total do contrato"
      ) ?? task.custom_fields.find(
        (f) => f.type === "number" && f.value !== null && f.value !== undefined
      );

      const value = parseClickUpValue(valueField?.value);
      if (!value) { skipped++; continue; }

      // Nome do instrutor — campo "Instrutor(a)"
      const instructorField = task.custom_fields.find(
        (f) => f.name === "Instrutor(a)" || f.name === "Instrutor"
      );
      const description = instructorField?.value
        ? String(instructorField.value).trim() || null
        : null;

      const existing = await prisma.expense.findUnique({
        where: { externalId: task.id },
      });

      if (existing) {
        await prisma.expense.update({
          where: { externalId: task.id },
          data: { month, date, value, description },
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
