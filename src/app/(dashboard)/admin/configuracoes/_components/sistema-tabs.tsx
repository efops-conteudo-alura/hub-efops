"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ConfigClient } from "./config-client";
import { StackInfo } from "./stack-info";

const tabs = [
  { id: "integracoes", label: "Integrações" },
  { id: "stack", label: "Stack" },
];

export function SistemaTabs() {
  const [active, setActive] = useState("integracoes");

  return (
    <div>
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={cn(
              "hub-tab-label px-5 py-4 border border-sidebar-border -ml-px first:ml-0 transition-colors relative",
              active === tab.id
                ? "bg-[#0c0d0e] text-foreground border-t-foreground z-10"
                : "bg-sidebar text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-6">
        {active === "integracoes" && <ConfigClient />}
        {active === "stack" && <StackInfo />}
      </div>
    </div>
  );
}
