"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil, CalendarRange } from "lucide-react";
import { PeriodoFormDialog } from "./periodo-form-dialog";
import { EntryFormDialog, type EntryData } from "./entry-form-dialog";

const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

interface Periodo {
  id: string;
  ano: number;
  mes: number;
  dataInicio: string | null;
  dataFim: string | null;
  feriados: number;
  diasUteis: number;
  _count: { entries: number };
}

interface Entry {
  id: string;
  periodoId: string;
  colaboradorNome: string;
  colaboradorMatricula: string | null;
  cargaHorariaTotal: number | null;
  cargaHorariaDiaria: number | null;
  produtoTipo: string | null;
  produtoId: string | null;
  produtoNome: string;
  horas: number;
}

interface PeriodoDetalhe extends Omit<Periodo, "_count"> {
  entries: Entry[];
}

interface Props {
  periodos: Periodo[];
}

function fmt(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function ImobilizacaoClient({ periodos: initialPeriodos }: Props) {
  const [periodos, setPeriodos] = useState<Periodo[]>(initialPeriodos);
  const [anoSelecionado, setAnoSelecionado] = useState<number>(() => {
    if (initialPeriodos.length > 0) return initialPeriodos[0].ano;
    return new Date().getFullYear();
  });
  const [mesSelecionado, setMesSelecionado] = useState<number | null>(() => {
    const primeiro = initialPeriodos.find((p) => p.ano === (initialPeriodos[0]?.ano ?? new Date().getFullYear()));
    return primeiro?.mes ?? null;
  });
  const [detalhe, setDetalhe] = useState<PeriodoDetalhe | null>(null);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState<string | null>(null);
  const [periodoDialogOpen, setPeriodoDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [entryEditando, setEntryEditando] = useState<EntryData | null>(null);

  const anos = [...new Set(periodos.map((p) => p.ano))].sort((a, b) => b - a);
  const mesesDoAno = periodos
    .filter((p) => p.ano === anoSelecionado)
    .map((p) => p.mes)
    .sort((a, b) => a - b);

  const reloadPeriodos = useCallback(async () => {
    const res = await fetch("/api/imobilizacao");
    if (res.ok) {
      const data = await res.json();
      setPeriodos(data);
    }
  }, []);

  const loadDetalhe = useCallback(async (ano: number, mes: number) => {
    setLoadingDetalhe(true);
    setErroDetalhe(null);
    try {
      const res = await fetch(`/api/imobilizacao/${ano}/${mes}`);
      if (res.ok) {
        setDetalhe(await res.json());
      } else {
        setErroDetalhe("Erro ao carregar os dados do período.");
      }
    } catch {
      setErroDetalhe("Erro de conexão ao carregar o período.");
    } finally {
      setLoadingDetalhe(false);
    }
  }, []);

  useEffect(() => {
    if (mesSelecionado !== null) {
      loadDetalhe(anoSelecionado, mesSelecionado);
    } else {
      setDetalhe(null);
    }
  }, [anoSelecionado, mesSelecionado, loadDetalhe]);

  const onPeriodoSuccess = async (novoPeriodo?: { ano: number; mes: number }) => {
    await reloadPeriodos();
    if (novoPeriodo) {
      setAnoSelecionado(novoPeriodo.ano);
      setMesSelecionado(novoPeriodo.mes);
    }
  };

  const onEntrySuccess = async () => {
    await Promise.all([
      mesSelecionado !== null ? loadDetalhe(anoSelecionado, mesSelecionado) : Promise.resolve(),
      reloadPeriodos(),
    ]);
  };

  const deletarEntry = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este lançamento?")) return;
    const res = await fetch(`/api/imobilizacao/${anoSelecionado}/${mesSelecionado}/entries/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Erro ao excluir o lançamento. Tente novamente.");
      return;
    }
    await onEntrySuccess();
  };

  const deletarPeriodo = async () => {
    if (!mesSelecionado) return;
    if (!confirm("Excluir o período e todos os lançamentos? Essa ação não pode ser desfeita.")) return;
    const res = await fetch(`/api/imobilizacao/${anoSelecionado}/${mesSelecionado}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Erro ao excluir o período. Tente novamente.");
      return;
    }
    await reloadPeriodos();
    setMesSelecionado(null);
    setDetalhe(null);
  };

  // Pivot table: linhas = produtos, colunas = colaboradores
  const colaboradores = detalhe
    ? [...new Set(detalhe.entries.map((e) => e.colaboradorNome))].sort()
    : [];

  type ProdutoKey = { tipo: string | null; id: string | null; nome: string };
  const produtosMap = new Map<string, ProdutoKey>();
  detalhe?.entries.forEach((e) => {
    const key = `${e.produtoId ?? e.id}__${e.produtoNome}`;
    if (!produtosMap.has(key)) produtosMap.set(key, { tipo: e.produtoTipo, id: e.produtoId, nome: e.produtoNome });
  });
  const produtos = [...produtosMap.entries()];

  const horasPorProdutoColaborador = (produtoKey: string, colab: string) => {
    return detalhe?.entries.find(
      (e) => `${e.produtoId ?? e.id}__${e.produtoNome}` === produtoKey && e.colaboradorNome === colab
    )?.horas ?? 0;
  };

  const totalPorColaborador = (colab: string) =>
    detalhe?.entries.filter((e) => e.colaboradorNome === colab).reduce((s, e) => s + e.horas, 0) ?? 0;

  const totalGeral = detalhe?.entries.reduce((s, e) => s + e.horas, 0) ?? 0;

  const periodoAtual = periodos.find((p) => p.ano === anoSelecionado && p.mes === mesSelecionado);

  if (periodos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <CalendarRange size={48} className="text-muted-foreground" />
        <div>
          <p className="text-lg font-medium">Nenhum período cadastrado</p>
          <p className="text-sm text-muted-foreground mt-1">Crie o primeiro período para começar a registrar horas.</p>
        </div>
        <Button onClick={() => setPeriodoDialogOpen(true)}>
          <Plus size={16} className="mr-2" />
          Novo Período
        </Button>
        <PeriodoFormDialog
          open={periodoDialogOpen}
          onOpenChange={setPeriodoDialogOpen}
          onSuccess={onPeriodoSuccess}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seletor de ano + botão novo período */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Ano:</span>
          <select
            value={anoSelecionado}
            onChange={(e) => {
              const novoAno = Number(e.target.value);
              setAnoSelecionado(novoAno);
              const primeiros = periodos.filter((p) => p.ano === novoAno).sort((a, b) => a.mes - b.mes);
              setMesSelecionado(primeiros[0]?.mes ?? null);
            }}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {anos.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <Button size="sm" onClick={() => setPeriodoDialogOpen(true)}>
          <Plus size={14} className="mr-2" />
          Novo Período
        </Button>
      </div>

      {/* Tabs de mês */}
      <div className="flex gap-1 flex-wrap">
        {mesesDoAno.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum período para {anoSelecionado}.</p>
        )}
        {mesesDoAno.map((mes) => (
          <button
            key={mes}
            onClick={() => setMesSelecionado(mes)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mesSelecionado === mes
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {MESES[mes - 1]}
          </button>
        ))}
      </div>

      {/* Conteúdo do mês */}
      {mesSelecionado !== null && (
        <div className="space-y-4">
          {/* Metadados do período */}
          {periodoAtual && (
            <div className="flex items-center justify-between flex-wrap gap-3 p-3 rounded-lg border bg-muted/30 text-sm">
              <div className="flex gap-4 flex-wrap">
                <span>
                  <span className="text-muted-foreground">Período: </span>
                  {fmt(periodoAtual.dataInicio)} – {fmt(periodoAtual.dataFim)}
                </span>
                <span>
                  <span className="text-muted-foreground">Feriados: </span>
                  {periodoAtual.feriados}
                </span>
                <span>
                  <span className="text-muted-foreground">Dias úteis: </span>
                  {periodoAtual.diasUteis}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEntryEditando(null);
                    setEntryDialogOpen(true);
                  }}
                >
                  <Plus size={14} className="mr-1" />
                  Adicionar Lançamento
                </Button>
                <Button size="sm" variant="destructive" onClick={deletarPeriodo}>
                  <Trash2 size={14} className="mr-1" />
                  Excluir Período
                </Button>
              </div>
            </div>
          )}

          {/* Pivot table */}
          {loadingDetalhe ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              Carregando...
            </div>
          ) : erroDetalhe ? (
            <div className="flex items-center justify-center h-32 text-destructive text-sm border rounded-lg bg-destructive/5">
              {erroDetalhe}
            </div>
          ) : detalhe && detalhe.entries.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground w-20">Tipo</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground w-24">ID</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground min-w-48">Produto</th>
                    {colaboradores.map((c) => (
                      <th key={c} className="text-center px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground">TOTAL</th>
                    <th className="px-2 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {produtos.map(([key, produto]) => {
                    const total = colaboradores.reduce(
                      (s, c) => s + horasPorProdutoColaborador(key, c),
                      0
                    );
                    const entry = detalhe.entries.find(
                      (e) => `${e.produtoId ?? e.id}__${e.produtoNome}` === key
                    );
                    return (
                      <tr key={key} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2 text-muted-foreground">{produto.tipo ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{produto.id ?? "—"}</td>
                        <td className="px-3 py-2 font-medium">{produto.nome}</td>
                        {colaboradores.map((c) => {
                          const horas = horasPorProdutoColaborador(key, c);
                          return (
                            <td key={c} className="px-3 py-2 text-center">
                              {horas > 0 ? horas : <span className="text-muted-foreground">—</span>}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center font-semibold">{total > 0 ? total : "—"}</td>
                        <td className="px-2 py-2">
                          {entry && (
                            <div className="flex gap-1 justify-end">
                              <button
                                title="Editar"
                                onClick={() => {
                                  setEntryEditando(entry);
                                  setEntryDialogOpen(true);
                                }}
                                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                title="Excluir"
                                onClick={() => deletarEntry(entry.id)}
                                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30 font-semibold">
                    <td className="px-3 py-2 text-muted-foreground" colSpan={3}>TOTAL</td>
                    {colaboradores.map((c) => (
                      <td key={c} className="px-3 py-2 text-center">{totalPorColaborador(c)}</td>
                    ))}
                    <td className="px-3 py-2 text-center">{totalGeral}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-center border rounded-lg bg-muted/10">
              <p className="text-sm text-muted-foreground">Nenhuma entry neste período.</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEntryEditando(null);
                  setEntryDialogOpen(true);
                }}
              >
                <Plus size={14} className="mr-1" />
                Adicionar Lançamento
              </Button>
            </div>
          )}
        </div>
      )}

      <PeriodoFormDialog
        open={periodoDialogOpen}
        onOpenChange={setPeriodoDialogOpen}
        onSuccess={onPeriodoSuccess}
      />

      {mesSelecionado !== null && (
        <EntryFormDialog
          open={entryDialogOpen}
          onOpenChange={(open) => {
            setEntryDialogOpen(open);
            if (!open) setEntryEditando(null);
          }}
          onSuccess={onEntrySuccess}
          ano={anoSelecionado}
          mes={mesSelecionado}
          entry={entryEditando}
        />
      )}
    </div>
  );
}
