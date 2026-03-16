"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Save, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ConfigKey = "CAELUM_BI_URL";

interface ConfigStatus {
  configured: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function ConfigClient() {
  const [status, setStatus] = useState<Record<ConfigKey, ConfigStatus> | null>(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function loadStatus() {
    const res = await fetch("/api/admin/config");
    if (res.ok) setStatus(await res.json());
  }

  useEffect(() => { loadStatus(); }, []);

  async function handleSave() {
    if (!value.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "CAELUM_BI_URL", value }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao salvar");
        return;
      }
      setSaved(true);
      setValue("");
      loadStatus();
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  const s = status?.["CAELUM_BI_URL"];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/40 p-6 space-y-3">
        <h2 className="font-semibold text-base">Caelum BI</h2>
        <p className="text-sm text-muted-foreground">
          O sync de cursos em <strong>Publicações</strong> busca os dados via uma query SQL salva no{" "}
          <strong>Caelum BI</strong> (<code>bi.caelumalura.com.br</code>). Cole aqui o link público da
          query para que o Hub consiga acessá-la.
        </p>
        <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 flex gap-2 text-sm text-blue-800 dark:text-blue-300">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>
            Caso a query tenha sido editada, você deverá rodá-la novamente no Caelum BI antes de clicar
            em <strong>Sync BI</strong>, para atualizar o cache e buscar os dados atualizados. Abra a
            query no Caelum BI e clique em <strong>"Executar agora"</strong>.
          </span>
        </div>
        <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 flex gap-2 text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>
            Se a query for deletada ou despublicada no Caelum BI, o sync vai parar de funcionar. Guarde
            o link em lugar seguro.
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="CAELUM_BI_URL">Link público da query</Label>
          {s?.configured && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Check size={12} />
              Configurado
            </span>
          )}
        </div>
        {s?.configured && s.updatedAt && (
          <p className="text-xs text-muted-foreground">
            Última atualização: {formatDate(s.updatedAt)}{s.updatedBy ? ` por ${s.updatedBy}` : ""}
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Input
            id="CAELUM_BI_URL"
            type="text"
            placeholder={
              s?.configured
                ? "Cole aqui para atualizar..."
                : "https://bi.caelumalura.com.br/public/result?id=..."
            }
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="font-mono text-xs"
          />
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!value.trim() || saving}
            className={cn(saved && "bg-green-600 hover:bg-green-600")}
          >
            {saved ? (
              <><Check size={14} className="mr-1" /> Salvo!</>
            ) : (
              <><Save size={14} className="mr-1" /> Salvar</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
