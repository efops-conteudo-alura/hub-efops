import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SubscriptionTable } from "@/components/subscription-table";
import { SubscriptionUploadButton } from "./_components/upload-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuditTab } from "./_components/audit-tab";

export default async function LicencasPage() {
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
          <h1 className="text-2xl font-bold">Licenças</h1>
          <p className="text-muted-foreground">
            {subscriptions.length}{" "}
            {subscriptions.length === 1 ? "item" : "itens"} cadastrados
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && <SubscriptionUploadButton />}
          <Link href="/licencas/nova">
            <Button>
              <Plus size={16} className="mr-2" />
              Nova Assinatura
            </Button>
          </Link>
        </div>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="lista">
          <TabsList className="mb-4">
            <TabsTrigger value="lista">Lista</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>
          <TabsContent value="lista">
            <SubscriptionTable subscriptions={subscriptions} isAdmin={isAdmin} />
          </TabsContent>
          <TabsContent value="historico">
            <AuditTab />
          </TabsContent>
        </Tabs>
      ) : (
        <SubscriptionTable subscriptions={subscriptions} isAdmin={isAdmin} />
      )}
    </div>
  );
}
