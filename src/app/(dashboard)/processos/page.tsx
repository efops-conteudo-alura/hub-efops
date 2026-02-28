import { GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ProcessosPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <GitBranch size={28} className="text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Processos & Fluxos</h1>
            <p className="text-muted-foreground">
              Mapeamento e documentação de processos do departamento
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-dashed p-12 text-center">
        <GitBranch size={40} className="mx-auto text-muted-foreground/40 mb-4" />
        <div className="flex justify-center mb-3">
          <Badge variant="outline">Em breve</Badge>
        </div>
        <p className="text-muted-foreground font-medium">Módulo em construção</p>
        <p className="text-sm text-muted-foreground mt-1">
          Visualização e gestão de processos e fluxos operacionais.
        </p>
      </div>
    </div>
  );
}
