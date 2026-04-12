import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SistemaTabs } from "./_components/sistema-tabs";

export default async function ConfiguracoesPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/home");

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="hub-page-title">Sistema</h1>
        <p className="hub-section-title mt-1">
          Integrações, credenciais e informações técnicas do hub.
        </p>
      </div>
      <SistemaTabs />
    </div>
  );
}
