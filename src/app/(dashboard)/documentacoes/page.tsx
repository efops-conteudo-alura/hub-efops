import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DocumentacoesPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <BookOpen size={28} className="text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Documentações</h1>
            <p className="text-muted-foreground">
              Base de conhecimento e documentações do time
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-dashed p-12 text-center">
        <BookOpen size={40} className="mx-auto text-muted-foreground/40 mb-4" />
        <div className="flex justify-center mb-3">
          <Badge variant="outline">Em breve</Badge>
        </div>
        <p className="text-muted-foreground font-medium">Módulo em construção</p>
        <p className="text-sm text-muted-foreground mt-1">
          Repositório centralizado de documentações, guias e referências do departamento.
        </p>
      </div>
    </div>
  );
}
