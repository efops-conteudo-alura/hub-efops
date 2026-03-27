import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TimesConfigClient } from "./_components/times-config-client";

export default async function ImobilizacaoConfigurarPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/home");
  }

  const times = await prisma.imobilizacaoTime.findMany({
    orderBy: { ordem: "asc" },
    include: { colaboradores: { orderBy: { ordem: "asc" } } },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="hub-page-title">Configuração de Times — Imobilização</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure os times, colaboradores, regras de alocação e a lista do ClickUp de cada time.
        </p>
      </div>
      <TimesConfigClient times={JSON.parse(JSON.stringify(times))} />
    </div>
  );
}
