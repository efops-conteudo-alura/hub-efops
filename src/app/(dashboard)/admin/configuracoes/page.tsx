import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ConfigClient } from "./_components/config-client";

export default async function ConfiguracoesPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/home");

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="hub-page-title">Configurações do sistema</h1>
        <p className="hub-section-title mt-1">
          Gerencie as integrações e credenciais usadas pelo hub.
        </p>
      </div>
      <ConfigClient />
    </div>
  );
}
