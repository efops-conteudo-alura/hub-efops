import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SubscriptionTable } from "@/components/subscription-table";

export default async function AssinaturasPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const subscriptions = await prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      url: true,
      loginUser: true,
      cost: true,
      currency: true,
      billingCycle: true,
      costCenter: true,
      team: true,
      responsible: true,
      isActive: true,
      renewalDate: true,
      notes: true,
      createdAt: true,
    },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Assinaturas e Licenças</h1>
          <p className="text-muted-foreground">
            {subscriptions.length}{" "}
            {subscriptions.length === 1 ? "item" : "itens"} cadastrados
          </p>
        </div>
        {isAdmin && (
          <Link href="/assinaturas/nova">
            <Button>
              <Plus size={16} className="mr-2" />
              Nova Assinatura
            </Button>
          </Link>
        )}
      </div>

      <SubscriptionTable subscriptions={subscriptions} isAdmin={isAdmin} />
    </div>
  );
}
