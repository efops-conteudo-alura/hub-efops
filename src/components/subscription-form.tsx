"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Info } from "lucide-react";

const PREDEFINED_COST_CENTERS = [
  "720ALURA225CONTEUDO",
  "720ALURA608AUDIOVISUAL",
  "720ALURA612SUPORTEEDUCACIONAL",
];

type FormData = {
  name: string;
  planName: string;
  description: string;
  url: string;
  loginUser: string;
  loginPass: string;
  loginType: string;
  cost: string;
  currency: string;
  billingCycle: string;
  costCenter: string;
  team: string;
  responsible: string;
  isActive: boolean;
  renewalDate: string;
  notes: string;
};

type InitialData = Partial<{
  id: string;
  name: string;
  planName: string | null;
  description: string | null;
  url: string | null;
  loginUser: string | null;
  loginPass: string | null;
  loginType: string | null;
  cost: number | null;
  currency: string;
  billingCycle: string;
  costCenter: string | null;
  team: string | null;
  responsible: string | null;
  isActive: boolean;
  renewalDate: Date | string | null;
  notes: string | null;
}>;

export function SubscriptionForm({
  initialData,
}: {
  initialData?: InitialData;
}) {
  const router = useRouter();
  const isEditing = !!initialData?.id;

  const getInitialCostCenterSelect = () => {
    const cc = initialData?.costCenter;
    if (!cc) return "";
    return PREDEFINED_COST_CENTERS.includes(cc) ? cc : "OUTRO";
  };

  const [formData, setFormData] = useState<FormData>({
    name: initialData?.name || "",
    planName: initialData?.planName || "",
    description: initialData?.description || "",
    url: initialData?.url || "",
    loginUser: initialData?.loginUser || "",
    loginPass: initialData?.loginPass || "",
    loginType: initialData?.loginType || "PASSWORD",
    cost: initialData?.cost?.toString() || "",
    currency: initialData?.currency || "BRL",
    billingCycle: initialData?.billingCycle || "MONTHLY",
    costCenter: initialData?.costCenter || "",
    team: initialData?.team || "",
    responsible: initialData?.responsible || "",
    isActive: initialData?.isActive ?? true,
    renewalDate: initialData?.renewalDate
      ? new Date(initialData.renewalDate as string).toISOString().split("T")[0]
      : "",
    notes: initialData?.notes || "",
  });

  const [costCenterSelect, setCostCenterSelect] = useState(
    getInitialCostCenterSelect()
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: keyof FormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleCostCenterSelect(value: string) {
    setCostCenterSelect(value);
    if (value !== "OUTRO") {
      set("costCenter", value === "" ? "" : value);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("O nome é obrigatório");
      return;
    }

    setLoading(true);
    try {
      const url = isEditing
        ? `/api/subscriptions/${initialData!.id}`
        : "/api/subscriptions";
      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Erro ao salvar");

      router.push("/licencas");
      router.refresh();
    } catch {
      setError("Erro ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const isCodeType = formData.loginType === "CODE";

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações Básicas */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Informações Básicas
            </p>

            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="ex: GitHub, Slack, Adobe Creative Cloud"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="planName">Nome do Plano (se aplicável)</Label>
              <Input
                id="planName"
                value={formData.planName}
                onChange={(e) => set("planName", e.target.value)}
                placeholder="ex: Pro, Business, Enterprise"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Descreva o uso desta assinatura..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Informações adicionais..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Credenciais de Acesso */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Credenciais de Acesso
            </p>

            <div className="space-y-2">
              <Label htmlFor="loginType">Tipo de Credencial</Label>
              <Select
                value={formData.loginType}
                onValueChange={(v) => set("loginType", v)}
              >
                <SelectTrigger id="loginType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PASSWORD">Usuário e Senha</SelectItem>
                  <SelectItem value="CODE">Código de Acesso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="loginUser">
                {isCodeType ? "Identificador (opcional)" : "Usuário / Email de Login"}
              </Label>
              <Input
                id="loginUser"
                value={formData.loginUser}
                onChange={(e) => set("loginUser", e.target.value)}
                placeholder={
                  isCodeType ? "ex: número de série, ID da conta" : "usuario@empresa.com"
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loginPass">
                {isCodeType ? "Código de Acesso" : "Senha"}
              </Label>
              <div className="relative">
                <Input
                  id="loginPass"
                  type={showPassword || isCodeType ? "text" : "password"}
                  value={formData.loginPass}
                  onChange={(e) => set("loginPass", e.target.value)}
                  placeholder={isCodeType ? "ex: XXXX-XXXX-XXXX-XXXX" : "••••••••"}
                  className="pr-10"
                />
                {!isCodeType && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Armazenado de forma criptografada
              </p>
            </div>

            <div className="rounded-md bg-muted p-3 flex gap-2">
              <Info size={14} className="text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Para obter as credenciais de acesso deste serviço, entre em
                contato com o time de{" "}
                <strong className="text-foreground">Eficiência Operacional</strong>.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Informações Financeiras */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Informações Financeiras
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cost">
                  Valor{formData.billingCycle === "USAGE" ? " (estimativa)" : ""}
                </Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost}
                  onChange={(e) => set("cost", e.target.value)}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Moeda</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(v) => set("currency", v)}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL (R$)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingCycle">Ciclo de Cobrança</Label>
              <Select
                value={formData.billingCycle}
                onValueChange={(v) => set("billingCycle", v)}
              >
                <SelectTrigger id="billingCycle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Mensal</SelectItem>
                  <SelectItem value="ANNUALLY">Anual</SelectItem>
                  <SelectItem value="ONE_TIME">Pagamento Único</SelectItem>
                  <SelectItem value="USAGE">Por Uso</SelectItem>
                </SelectContent>
              </Select>
              {formData.billingCycle === "USAGE" && (
                <p className="text-xs text-muted-foreground">
                  Cobrança variável conforme uso. Informe uma estimativa se disponível.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="renewalDate">Data de Renovação</Label>
              <Input
                id="renewalDate"
                type="date"
                value={formData.renewalDate}
                onChange={(e) => set("renewalDate", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Organização e Responsabilidade */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Organização e Responsabilidade
            </p>

            <div className="space-y-2">
              <Label htmlFor="team">Time</Label>
              <Input
                id="team"
                value={formData.team}
                onChange={(e) => set("team", e.target.value)}
                placeholder="ex: Engenharia, Marketing, Design"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="costCenter">Centro de Custo</Label>
              <Select
                value={costCenterSelect}
                onValueChange={handleCostCenterSelect}
              >
                <SelectTrigger id="costCenter">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_COST_CENTERS.map((cc) => (
                    <SelectItem key={cc} value={cc}>
                      {cc}
                    </SelectItem>
                  ))}
                  <SelectItem value="OUTRO">Outro...</SelectItem>
                </SelectContent>
              </Select>
              {costCenterSelect === "OUTRO" && (
                <Input
                  placeholder="Digite o centro de custo"
                  value={formData.costCenter}
                  onChange={(e) => set("costCenter", e.target.value)}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsible">Responsável</Label>
              <Input
                id="responsible"
                value={formData.responsible}
                onChange={(e) => set("responsible", e.target.value)}
                placeholder="Nome do responsável"
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.isActive}
                  onClick={() => set("isActive", !formData.isActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    formData.isActive ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      formData.isActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-sm text-muted-foreground">
                  {formData.isActive ? "Ativa" : "Inativa"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && <p className="text-sm text-destructive mt-4">{error}</p>}

      <div className="flex gap-3 mt-6">
        <Button type="submit" disabled={loading}>
          {loading
            ? "Salvando..."
            : isEditing
            ? "Salvar Alterações"
            : "Criar Assinatura"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/licencas")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
