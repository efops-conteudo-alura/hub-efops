import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ReportView } from "../_components/report-view";

interface ReportField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/home");

  const { id } = await params;
  const report = await prisma.report.findUnique({
    where: { id },
    include: { responses: { orderBy: { createdAt: "asc" } } },
  });

  if (!report) notFound();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/relatorios" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={20} />
        </Link>
      </div>
      <ReportView
        report={{
          id: report.id,
          title: report.title,
          objective: report.objective,
          fields: report.fields as ReportField[],
          token: report.token,
          responses: report.responses.map((r) => ({
            id: r.id,
            data: r.data as Record<string, string>,
            createdAt: r.createdAt.toISOString(),
          })),
        }}
      />
    </div>
  );
}
