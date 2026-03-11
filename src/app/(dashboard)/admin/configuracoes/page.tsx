import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ConfigClient } from "./_components/config-client";

export default async function ConfiguracoesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/home");

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações do sistema</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie as integrações e credenciais usadas pelo hub.
        </p>
      </div>
      <ConfigClient />
    </div>
  );
}
