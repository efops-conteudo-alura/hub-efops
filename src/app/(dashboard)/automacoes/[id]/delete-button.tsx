"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteAutomationButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Excluir esta automação? Esta ação não pode ser desfeita.")) return;
    setLoading(true);
    await fetch(`/api/automacoes/${id}`, { method: "DELETE" });
    router.push("/automacoes");
    router.refresh();
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
      <Trash2 size={16} className="mr-2" />
      {loading ? "Excluindo..." : "Excluir"}
    </Button>
  );
}
