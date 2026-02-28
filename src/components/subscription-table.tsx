"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, Trash2, Search, Download, ExternalLink } from "lucide-react";

export type Subscription = {
  id: string;
  name: string;
  description?: string | null;
  url?: string | null;
  loginUser?: string | null;
  cost?: number | null;
  currency: string;
  billingCycle: string;
  costCenter?: string | null;
  team?: string | null;
  responsible?: string | null;
  isActive: boolean;
  renewalDate?: Date | string | null;
  notes?: string | null;
  createdAt: Date | string;
};

const BILLING_LABELS: Record<string, string> = {
  MONTHLY: "Mensal",
  ANNUALLY: "Anual",
  ONE_TIME: "Único",
};

function exportToCSV(data: Subscription[]) {
  const headers = [
    "Nome",
    "Time",
    "Centro de Custo",
    "Responsável",
    "Valor",
    "Moeda",
    "Ciclo",
    "Status",
    "Login",
    "URL",
    "Renovação",
  ];
  const rows = data.map((s) => [
    s.name,
    s.team || "",
    s.costCenter || "",
    s.responsible || "",
    s.cost?.toString() || "",
    s.currency,
    BILLING_LABELS[s.billingCycle] || s.billingCycle,
    s.isActive ? "Ativa" : "Inativa",
    s.loginUser || "",
    s.url || "",
    s.renewalDate
      ? new Date(s.renewalDate).toLocaleDateString("pt-BR")
      : "",
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "assinaturas.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function SubscriptionTable({
  subscriptions,
}: {
  subscriptions: Subscription[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterTeam, setFilterTeam] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCostCenter, setFilterCostCenter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const teams = useMemo(() => {
    const t = [
      ...new Set(subscriptions.map((s) => s.team).filter(Boolean)),
    ] as string[];
    return t.sort();
  }, [subscriptions]);

  const costCenters = useMemo(() => {
    const c = [
      ...new Set(subscriptions.map((s) => s.costCenter).filter(Boolean)),
    ] as string[];
    return c.sort();
  }, [subscriptions]);

  const filtered = useMemo(() => {
    return subscriptions.filter((s) => {
      const matchSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.team?.toLowerCase().includes(search.toLowerCase()) ||
        s.responsible?.toLowerCase().includes(search.toLowerCase()) ||
        s.costCenter?.toLowerCase().includes(search.toLowerCase());
      const matchTeam = filterTeam === "all" || s.team === filterTeam;
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && s.isActive) ||
        (filterStatus === "inactive" && !s.isActive);
      const matchCostCenter =
        filterCostCenter === "all" || s.costCenter === filterCostCenter;
      return matchSearch && matchTeam && matchStatus && matchCostCenter;
    });
  }, [subscriptions, search, filterTeam, filterStatus, filterCostCenter]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    await fetch(`/api/subscriptions/${deleteId}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteId(null);
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Buscar por nome, time, responsável..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativas</SelectItem>
            <SelectItem value="inactive">Inativas</SelectItem>
          </SelectContent>
        </Select>

        {teams.length > 0 && (
          <Select value={filterTeam} onValueChange={setFilterTeam}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os times</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {costCenters.length > 0 && (
          <Select value={filterCostCenter} onValueChange={setFilterCostCenter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Centro de Custo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os CCs</SelectItem>
              {costCenters.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button variant="outline" onClick={() => exportToCSV(filtered)}>
          <Download size={16} className="mr-2" />
          Exportar CSV
        </Button>
      </div>

      <div className="text-xs text-muted-foreground mb-2">
        {filtered.length} de {subscriptions.length} item
        {subscriptions.length !== 1 ? "s" : ""}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Centro de Custo</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Ciclo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[90px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-10"
                >
                  Nenhuma assinatura encontrada
                </TableCell>
              </TableRow>
            )}
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{s.name}</p>
                    {s.url && (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:underline flex items-center gap-1 w-fit"
                      >
                        {s.url.replace(/^https?:\/\//, "").split("/")[0]}
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{s.team || "—"}</TableCell>
                <TableCell className="text-sm">
                  {s.costCenter || "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {s.responsible || "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {s.cost
                    ? `${s.currency} ${s.cost.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}`
                    : "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {BILLING_LABELS[s.billingCycle] || s.billingCycle}
                </TableCell>
                <TableCell>
                  <Badge variant={s.isActive ? "default" : "secondary"}>
                    {s.isActive ? "Ativa" : "Inativa"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Link href={`/assinaturas/${s.id}/editar`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit size={14} />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(s.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta assinatura? Esta ação não
              pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
