"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Save, AlertCircle, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type ConfigKey = "ALURA_SESSION_COOKIE" | "ALURA_CAELUM_TOKEN" | "ALURA_USER_ID";

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

const FIELDS: { key: ConfigKey; label: string; description: string }[] = [
  {
    key: "ALURA_SESSION_COOKIE",
    label: "Cookie SESSION",
    description: "Valor do cookie SESSION do cursos.alura.com.br",
  },
  {
    key: "ALURA_CAELUM_TOKEN",
    label: "Cookie caelum.login.token",
    description: "Token de autenticação da Caelum (empresa mãe da Alura)",
  },
  {
    key: "ALURA_USER_ID",
    label: "Cookie alura.userId",
    description: "ID do usuário logado na Alura",
  },
];

export function ConfigClient() {
  const [status, setStatus] = useState<Record<ConfigKey, ConfigStatus> | null>(null);
  const [values, setValues] = useState<Record<ConfigKey, string>>({
    ALURA_SESSION_COOKIE: "",
    ALURA_CAELUM_TOKEN: "",
    ALURA_USER_ID: "",
  });
  const [visible, setVisible] = useState<Record<ConfigKey, boolean>>({
    ALURA_SESSION_COOKIE: false,
    ALURA_CAELUM_TOKEN: false,
    ALURA_USER_ID: false,
  });
  const [saving, setSaving] = useState<ConfigKey | null>(null);
  const [saved, setSaved] = useState<ConfigKey | null>(null);
  const [error, setError] = useState<string>("");

  async function loadStatus() {
    const res = await fetch("/api/admin/config");
    if (res.ok) setStatus(await res.json());
  }

  useEffect(() => { loadStatus(); }, []);

  async function handleSave(key: ConfigKey) {
    if (!values[key].trim()) return;
    setSaving(key);
    setError("");
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: values[key] }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao salvar");
        return;
      }
      setSaved(key);
      setValues((v) => ({ ...v, [key]: "" }));
      loadStatus();
      setTimeout(() => setSaved(null), 3000);
    } catch {
      setError("Erro de conexão");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-10">
      {/* Instruções */}
      <div className="rounded-lg border bg-muted/40 p-6 space-y-4">
        <h2 className="font-semibold text-base">Cookies de acesso ao admin da Alura</h2>
        <p className="text-sm text-muted-foreground">
          Para sincronizar cursos pelo botão <strong>Sync Admin</strong> em Publicações, o hub precisa se autenticar no painel admin da Alura em seu nome. Isso é feito através dos cookies da sua sessão de login.
        </p>
        <p className="text-sm text-muted-foreground">
          Os cookies expiram após algumas horas ou ao fechar o navegador. Quando o sync retornar erro de cookie expirado, basta seguir os passos abaixo para renová-los.
        </p>

        <div className="space-y-4">
          {/* Firefox */}
          <div>
            <p className="text-sm font-medium mb-2">Firefox</p>
            <ol className="space-y-2 text-sm">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                <span>Acesse <strong>cursos.alura.com.br/admin/courses</strong> logado com sua conta admin da Alura.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                <span>Pressione <strong>F12</strong> → aba <strong>Armazenamento</strong> → <strong>Cookies</strong> → <strong>https://cursos.alura.com.br</strong>.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                <span>Localize cada cookie pelo nome na lista, clique nele e copie o <strong>Valor</strong> na coluna da direita.</span>
              </li>
            </ol>
          </div>

          {/* Chrome */}
          <div>
            <p className="text-sm font-medium mb-2">Chrome</p>
            <ol className="space-y-2 text-sm">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                <span>Acesse <strong>cursos.alura.com.br/admin/courses</strong> logado com sua conta admin da Alura.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                <span>Pressione <strong>F12</strong> → aba <strong>Application</strong> → <strong>Cookies</strong> (menu lateral) → <strong>https://cursos.alura.com.br</strong>.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                <span>Localize cada cookie pelo nome, clique na linha e copie o valor da coluna <strong>Cookie Value</strong> no painel inferior.</span>
              </li>
            </ol>
          </div>

          <p className="text-sm text-muted-foreground">Após copiar, cole cada valor no campo correspondente abaixo e clique em <strong>Salvar</strong>. Os valores ficam criptografados no banco.</p>
        </div>

        <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 flex gap-2 text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>Nunca compartilhe esses valores. Eles dão acesso à sua conta admin da Alura.</span>
        </div>
      </div>

      {/* Formulário */}
      <div className="space-y-6">
        <h2 className="font-semibold text-base">Cookies de acesso</h2>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {FIELDS.map(({ key, label, description }) => {
          const s = status?.[key];
          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor={key}>{label}</Label>
                {s?.configured && (
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <Check size={12} />
                    Configurado
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{description}</p>
              {s?.configured && s.updatedAt && (
                <p className="text-xs text-muted-foreground">
                  Última atualização: {formatDate(s.updatedAt)}{s.updatedBy ? ` por ${s.updatedBy}` : ""}
                </p>
              )}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id={key}
                    type={visible[key] ? "text" : "password"}
                    placeholder={s?.configured ? "Cole aqui para atualizar..." : "Cole o valor do cookie aqui..."}
                    value={values[key]}
                    onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                    className="pr-9 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setVisible((v) => ({ ...v, [key]: !v[key] }))}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {visible[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSave(key)}
                  disabled={!values[key].trim() || saving === key}
                  className={cn(saved === key && "bg-green-600 hover:bg-green-600")}
                >
                  {saved === key ? (
                    <><Check size={14} className="mr-1" /> Salvo!</>
                  ) : (
                    <><Save size={14} className="mr-1" /> Salvar</>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
