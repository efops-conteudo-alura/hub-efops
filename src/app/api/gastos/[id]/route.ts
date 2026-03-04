import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { month, date, value, category, description, notes } = body;

  if (month && !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month deve estar no formato AAAA-MM" }, { status: 400 });
  }

  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date deve estar no formato AAAA-MM-DD" }, { status: 400 });
  }

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      ...(month ? { month } : {}),
      ...(date !== undefined ? { date: date || null } : {}),
      ...(value !== undefined ? { value: parseFloat(value) } : {}),
      ...(category ? { category } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(notes !== undefined ? { notes: notes || null } : {}),
    },
  });

  return NextResponse.json(expense);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.expense.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
