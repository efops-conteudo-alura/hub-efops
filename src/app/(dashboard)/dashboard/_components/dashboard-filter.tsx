"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Periodo = "mes-atual" | "mes-passado" | "ano-atual" | "ano-passado";

const OPTIONS: { value: Periodo; label: string }[] = [
  { value: "mes-atual", label: "Mês atual" },
  { value: "mes-passado", label: "Mês passado" },
  { value: "ano-atual", label: "Ano atual" },
  { value: "ano-passado", label: "Ano passado" },
];

export function DashboardFilter({ active }: { active: string | null }) {
  const router = useRouter();

  function setPeriodo(p: Periodo) {
    if (active === p) {
      router.push("/dashboard");
    } else {
      router.push(`/dashboard?periodo=${p}`);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          size="sm"
          variant={active === opt.value ? "default" : "outline"}
          onClick={() => setPeriodo(opt.value)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
