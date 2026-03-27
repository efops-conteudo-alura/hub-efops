"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SubscriptionTable } from "@/components/subscription-table";
import { AuditTab } from "./audit-tab";
import type { Prisma } from "@/generated/prisma";

type Subscription = Prisma.SubscriptionGetPayload<{
  select: {
    id: true;
    name: true;
    description: true;
    url: true;
    loginUser: true;
    cost: true;
    currency: true;
    billingCycle: true;
    costCenter: true;
    team: true;
    responsible: true;
    isActive: true;
    renewalDate: true;
    notes: true;
    createdAt: true;
  };
}>;

const tabs = [
  { key: "lista", label: "Lista" },
  { key: "historico", label: "Histórico" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export function LicencasClient({
  subscriptions,
  isAdmin,
}: {
  subscriptions: Subscription[];
  isAdmin: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("lista");

  return (
    <>
      <div className="flex mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-5 py-4 text-xs font-mono font-semibold uppercase border border-sidebar-border -ml-px first:ml-0 transition-colors relative",
              activeTab === tab.key
                ? "bg-[#0c0d0e] text-foreground border-t-foreground z-10"
                : "bg-sidebar text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "lista" && (
        <SubscriptionTable subscriptions={subscriptions} isAdmin={isAdmin} />
      )}
      {activeTab === "historico" && <AuditTab />}
    </>
  );
}
