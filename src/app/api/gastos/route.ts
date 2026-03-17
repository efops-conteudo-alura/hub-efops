import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const monthFrom = searchParams.get("month_from");
  const monthTo = searchParams.get("month_to");
  const categories = searchParams.getAll("categories[]");

  const expenses = await prisma.expense.findMany({
    where: {
      ...(monthFrom || monthTo
        ? {
            month: {
              ...(monthFrom ? { gte: monthFrom } : {}),
              ...(monthTo ? { lte: monthTo } : {}),
            },
          }
        : {}),
      ...(categories.length > 0
        ? { category: { in: categories as import("@prisma/client").ExpenseCategory[] } }
        : {}),
    },
    orderBy: [{ month: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(expenses);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { month, date, value, category, description, notes } = body;

  if (!month || !value || !category) {
    return NextResponse.json({ error: "month, value e category são obrigatórios" }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month deve estar no formato AAAA-MM" }, { status: 400 });
  }

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date deve estar no formato AAAA-MM-DD" }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: {
      month,
      date: date || null,
      value: parseFloat(value),
      category,
      description: description || null,
      notes: notes || null,
      source: "MANUAL",
    },
  });

  return NextResponse.json(expense, { status: 201 });
}
