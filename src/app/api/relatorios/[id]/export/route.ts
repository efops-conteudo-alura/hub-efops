import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import * as XLSX from "xlsx";

interface ReportField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const report = await prisma.report.findUnique({
    where: { id },
    include: { responses: { orderBy: { createdAt: "asc" } } },
  });

  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fields = report.fields as unknown as ReportField[];
  const header = [...fields.map((f) => f.label), "Respondido em"];

  const rows = report.responses.map((r) => {
    const data = r.data as Record<string, string>;
    return [
      ...fields.map((f) => data[f.id] ?? ""),
      new Date(r.createdAt).toLocaleString("pt-BR"),
    ];
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, "Respostas");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const safeName = report.title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safeName}.xlsx"`,
    },
  });
}
