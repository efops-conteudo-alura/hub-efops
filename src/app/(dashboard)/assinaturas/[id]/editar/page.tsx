import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { SubscriptionForm } from "@/components/subscription-form";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function EditarAssinaturaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const subscription = await prisma.subscription.findUnique({ where: { id } });

  if (!subscription) notFound();

  const data = {
    ...subscription,
    loginPass: subscription.loginPass
      ? decrypt(subscription.loginPass)
      : null,
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/assinaturas"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4 w-fit"
        >
          <ChevronLeft size={16} />
          Voltar para Assinaturas
        </Link>
        <h1 className="text-2xl font-bold">Editar Assinatura</h1>
        <p className="text-muted-foreground">{subscription.name}</p>
      </div>

      <SubscriptionForm initialData={data} />
    </div>
  );
}
