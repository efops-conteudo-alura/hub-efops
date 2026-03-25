import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ImobilizacaoClient } from "./_components/imobilizacao-client";

export default async function ImobilizacaoPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/home");
  }

  const [periodos, times] = await Promise.all([
    prisma.imobilizacaoPeriodo.findMany({
      orderBy: [{ ano: "desc" }, { mes: "desc" }],
      select: {
        id: true,
        ano: true,
        mes: true,
        dataInicio: true,
        dataFim: true,
        feriados: true,
        diasUteis: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { entries: true } },
      },
    }),
    prisma.imobilizacaoTime.findMany({
      orderBy: { ordem: "asc" },
      include: { colaboradores: { orderBy: { ordem: "asc" } } },
    }),
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Imobilização</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Registro de horas por colaborador e produto por período.
        </p>
      </div>
      <ImobilizacaoClient
        periodos={JSON.parse(JSON.stringify(periodos))}
        times={JSON.parse(JSON.stringify(times))}
      />
    </div>
  );
}
