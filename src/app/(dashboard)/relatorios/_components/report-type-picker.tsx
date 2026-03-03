"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableProperties } from "lucide-react";

const TYPES = [
  {
    key: "planilha",
    label: "Formulário & Planilha",
    description: "Crie campos personalizados e compartilhe um formulário de coleta. As respostas são organizadas em tabela exportável.",
    icon: TableProperties,
    available: true,
  },
  {
    key: "grafico",
    label: "Gráfico dinâmico",
    description: "Visualize dados em gráficos interativos com filtros por período.",
    icon: TableProperties,
    available: false,
  },
];

export function ReportTypePicker() {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
      {TYPES.map((type) => {
        const Icon = type.icon;
        return (
          <Card
            key={type.key}
            className={`transition-colors ${
              type.available
                ? "cursor-pointer hover:border-primary hover:shadow-sm"
                : "opacity-50 cursor-not-allowed"
            }`}
            onClick={() => type.available && router.push(`/relatorios/novo/planilha`)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Icon size={18} className="text-primary" />
                  </div>
                  <CardTitle className="text-sm">{type.label}</CardTitle>
                </div>
                {!type.available && (
                  <Badge variant="outline" className="text-xs">Em breve</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{type.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
