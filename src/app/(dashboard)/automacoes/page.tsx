import { Bot, Calculator, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AutomacoesPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Bot size={28} className="text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Automações & Agentes</h1>
            <p className="text-muted-foreground">
              Portfólio de automações e agentes de IA do departamento
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles size={18} className="text-muted-foreground" />
              Portfólio de Automações
              <Badge variant="outline" className="ml-auto">Em breve</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Catálogo de todas as automações ativas, com descrição, responsável, ferramentas utilizadas e status.
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator size={18} className="text-muted-foreground" />
              Calculadora de ROI
              <Badge variant="outline" className="ml-auto">Em breve</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Estime economia mensal, payback e viabilidade de projetos de IA e automação.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-dashed p-12 text-center">
        <Bot size={40} className="mx-auto text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground font-medium">Módulo em construção</p>
        <p className="text-sm text-muted-foreground mt-1">
          Em breve o portfólio completo de automações e agentes estará disponível aqui.
        </p>
      </div>
    </div>
  );
}
