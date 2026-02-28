"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const EMPTY_FORM = {
  name: "", type: "AUTOMATION", shortDesc: "", fullDesc: "",
  thumbnailUrl: "", status: "ACTIVE", creator: "",
  roiHoursSaved: "", roiMonthlySavings: "", roiDescription: "",
};

export function NewAutomationDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [tools, setTools] = useState<string[]>([]);
  const [toolInput, setToolInput] = useState("");

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addTool() {
    const t = toolInput.trim();
    if (t && !tools.includes(t)) setTools((prev) => [...prev, t]);
    setToolInput("");
  }

  function removeTool(tool: string) {
    setTools((prev) => prev.filter((t) => t !== tool));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/automacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tools }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro ao criar"); return; }
      setOpen(false);
      setForm(EMPTY_FORM);
      setTools([]);
      router.refresh();
    } catch {
      setError("Erro ao criar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus size={16} className="mr-2" />
          Nova Automação / Agente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Automação / Agente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex: Agente de triagem de emails" required />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => set("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUTOMATION">Automação</SelectItem>
                  <SelectItem value="AGENT">Agente de IA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Ativa</SelectItem>
                  <SelectItem value="TESTING">Em teste</SelectItem>
                  <SelectItem value="INACTIVE">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Criador(a)</Label>
              <Input value={form.creator} onChange={(e) => set("creator", e.target.value)} placeholder="Nome do criador" />
            </div>

            <div className="space-y-2">
              <Label>URL da thumbnail <span className="text-xs text-muted-foreground">(opcional)</span></Label>
              <Input value={form.thumbnailUrl} onChange={(e) => set("thumbnailUrl", e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição breve</Label>
            <Input value={form.shortDesc} onChange={(e) => set("shortDesc", e.target.value)} placeholder="Uma frase resumindo o que faz" />
          </div>

          <div className="space-y-2">
            <Label>Descrição completa</Label>
            <Textarea value={form.fullDesc} onChange={(e) => set("fullDesc", e.target.value)} placeholder="Descreva em detalhes o funcionamento, contexto e impacto..." rows={4} />
          </div>

          <div className="space-y-2">
            <Label>Ferramentas utilizadas</Label>
            <div className="flex gap-2">
              <Input
                value={toolInput}
                onChange={(e) => setToolInput(e.target.value)}
                placeholder="Ex: Zapier, ChatGPT, Power Automate..."
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTool(); } }}
              />
              <Button type="button" variant="outline" onClick={addTool}>Adicionar</Button>
            </div>
            {tools.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tools.map((t) => (
                  <Badge key={t} variant="secondary" className="gap-1">
                    {t}
                    <button type="button" onClick={() => removeTool(t)}><X size={12} /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium">ROI <span className="text-xs text-muted-foreground font-normal">(opcional)</span></p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Horas economizadas / semana</Label>
                <Input type="number" step="0.5" value={form.roiHoursSaved} onChange={(e) => set("roiHoursSaved", e.target.value)} placeholder="Ex: 4.5" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Economia mensal estimada (R$)</Label>
                <Input type="number" step="0.01" value={form.roiMonthlySavings} onChange={(e) => set("roiMonthlySavings", e.target.value)} placeholder="Ex: 1200" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Descrição do ROI</Label>
              <Textarea value={form.roiDescription} onChange={(e) => set("roiDescription", e.target.value)} placeholder="Ex: Elimina 4h/semana de triagem manual de emails, permitindo..." rows={2} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Criando..." : "Criar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
