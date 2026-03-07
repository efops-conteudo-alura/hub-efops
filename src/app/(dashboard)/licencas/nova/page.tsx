import { SubscriptionForm } from "@/components/subscription-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NovaAssinaturaPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/licencas"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4 w-fit"
        >
          <ChevronLeft size={16} />
          Voltar para Licenças
        </Link>
        <h1 className="text-2xl font-bold">Nova Assinatura</h1>
        <p className="text-muted-foreground">
          Preencha os dados da assinatura ou licença
        </p>
      </div>

      <SubscriptionForm />
    </div>
  );
}
