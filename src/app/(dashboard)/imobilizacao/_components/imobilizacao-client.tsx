"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, CalendarRange, Copy, Check, RefreshCw, Settings, Pencil } from "lucide-react";
import { PeriodoFormDialog, type PeriodoData } from "./periodo-form-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

interface Colaborador {
  id: string;
  nome: string;
  clickupUsername: string | null;
  ordem: number;
}

interface Time {
  id: string;
  nome: string;
  clickupListId: string;
  ordem: number;
  colaboradores: Colaborador[];
}

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
  timeId: string | null;
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
  times: Time[];
}

function fmt(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function buildImobilizacaoTsv(time: Time, entries: Entry[]): string {
  const colaboradores = time.colaboradores.sort((a, b) => a.ordem - b.ordem);
  const entriesDoTime = entries.filter((e) => e.timeId === time.id);

  type ProdKey = { id: string; nome: string; key: string };
  const produtoMap = new Map<string, ProdKey>();
  const horasMap = new Map<string, Map<string, number>>();

  for (const e of entriesDoTime) {
    const key = `${e.produtoId ?? ""}__${e.produtoNome}`;
    if (!produtoMap.has(key)) {
      produtoMap.set(key, { id: e.produtoId ?? "", nome: e.produtoNome, key });
      horasMap.set(key, new Map());
    }
    horasMap.get(key)!.set(e.colaboradorNome, e.horas);
  }

  if (produtoMap.size === 0) return "";

  const produtos = [...produtoMap.values()];
  const nomes = colaboradores.map((c) => c.nome);
  const header = ["ID", "Produto", ...nomes, "Total por Curso"].join("\t");

  const totaisPorPessoa = nomes.map((nome) =>
    produtos.reduce((s, p) => s + (horasMap.get(p.key)?.get(nome) ?? 0), 0)
  );
  const grandTotal = totaisPorPessoa.reduce((s, v) => s + v, 0);
  const totalRow = ["", "Total por Pessoa", ...totaisPorPessoa, grandTotal].join("\t");

  const rows = produtos.map((p) => {
    const horasPorPessoa = nomes.map((nome) => horasMap.get(p.key)?.get(nome) ?? "");
    const totalCurso = nomes.reduce((s, nome) => s + (horasMap.get(p.key)?.get(nome) ?? 0), 0);
    return [p.id, p.nome, ...horasPorPessoa, totalCurso].join("\t");
  });

  return [header, totalRow, ...rows].join("\n");
}

function CelulaHorasEditavel({
  entryId,
  valor,
  ano,
  mes,
  onSalvo,
}: {
  entryId: string | null;
  valor: number;
  ano: number;
  mes: number;
  onSalvo: (novoValor: number) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [input, setInput] = useState(String(valor));
  const [salvando, setSalvando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editando && inputRef.current) inputRef.current.select();
  }, [editando]);

  const salvar = async () => {
    if (!entryId) { setEditando(false); return; }
    const novoValor = parseInt(input, 10);
    if (isNaN(novoValor) || novoValor < 0) { setEditando(false); setInput(String(valor)); return; }
    if (novoValor === valor) { setEditando(false); return; }
    setSalvando(true);
    try {
      const res = await fetch(`/api/imobilizacao/${ano}/${mes}/entries/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horas: novoValor }),
      });
      if (res.ok) {
        onSalvo(novoValor);
      } else {
        setInput(String(valor)); // reverte se falhou
      }
    } finally {
      setSalvando(false);
      setEditando(false);
    }
  };

  if (editando) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={0}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onBlur={salvar}
        onKeyDown={(e) => {
          if (e.key === "Enter") salvar();
          if (e.key === "Escape") { setEditando(false); setInput(String(valor)); }
        }}
        className="w-12 text-center text-xs border rounded px-1 py-0.5 bg-background"
        disabled={salvando}
      />
    );
  }

  return (
    <button
      onClick={() => { setEditando(true); setInput(String(valor)); }}
      className={`w-full text-center px-1 rounded hover:bg-muted/50 transition-colors text-xs ${
        valor > 0 ? "" : "text-muted-foreground"
      }`}
      title="Clique para editar"
    >
      {valor > 0 ? valor : "—"}
    </button>
  );
}

export function ImobilizacaoClient({ periodos: initialPeriodos, times }: Props) {
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

  // Aba de time selecionada
  const [timeSelecionadoId, setTimeSelecionadoId] = useState<string | null>(
    times.length > 0 ? times[0].id : null
  );

  // Sync por time
  const [syncLoading, setSyncLoading] = useState<Record<string, boolean>>({});
  const [syncResultado, setSyncResultado] = useState<Record<string, string>>({});

  // Copy por time
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  // Editar período
  const [periodoParaEditar, setPeriodoParaEditar] = useState<PeriodoData | null>(null);

  // Adicionar curso manualmente
  const [addCursoOpen, setAddCursoOpen] = useState(false);
  const [addCursoLoading, setAddCursoLoading] = useState(false);
  const [addCursoNome, setAddCursoNome] = useState("");
  const [addCursoId, setAddCursoId] = useState("");

  const anos = [...new Set(periodos.map((p) => p.ano))].sort((a, b) => b - a);
  const mesesDoAno = periodos
    .filter((p) => p.ano === anoSelecionado)
    .map((p) => p.mes)
    .sort((a, b) => a - b);

  const reloadPeriodos = useCallback(async () => {
    const res = await fetch("/api/imobilizacao");
    if (res.ok) setPeriodos(await res.json());
  }, []);

  const loadDetalhe = useCallback(async (ano: number, mes: number) => {
    setLoadingDetalhe(true);
    setErroDetalhe(null);
    try {
      const res = await fetch(`/api/imobilizacao/${ano}/${mes}`);
      if (res.ok) setDetalhe(await res.json());
      else setErroDetalhe("Erro ao carregar os dados do período.");
    } catch {
      setErroDetalhe("Erro de conexão ao carregar o período.");
    } finally {
      setLoadingDetalhe(false);
    }
  }, []);

  useEffect(() => {
    if (mesSelecionado !== null) loadDetalhe(anoSelecionado, mesSelecionado);
    else setDetalhe(null);
  }, [anoSelecionado, mesSelecionado, loadDetalhe]);

  const onPeriodoSuccess = async (novoPeriodo?: { ano: number; mes: number }) => {
    await reloadPeriodos();
    if (novoPeriodo) {
      setAnoSelecionado(novoPeriodo.ano);
      setMesSelecionado(novoPeriodo.mes);
    }
  };

  const [deletandoPeriodo, setDeletandoPeriodo] = useState(false);

  const deletarPeriodo = async () => {
    if (!mesSelecionado || deletandoPeriodo) return;
    if (!confirm("Excluir o período e todos os lançamentos? Essa ação não pode ser desfeita.")) return;
    setDeletandoPeriodo(true);
    try {
      const res = await fetch(`/api/imobilizacao/${anoSelecionado}/${mesSelecionado}`, { method: "DELETE" });
      if (!res.ok) { alert("Erro ao excluir o período."); return; }
      await reloadPeriodos();
      setMesSelecionado(null);
      setDetalhe(null);
    } finally {
      setDeletandoPeriodo(false);
    }
  };

  const syncTime = async (timeId: string) => {
    if (!mesSelecionado) return;
    setSyncLoading((prev) => ({ ...prev, [timeId]: true }));
    setSyncResultado((prev) => ({ ...prev, [timeId]: "" }));
    try {
      const res = await fetch(`/api/imobilizacao/${anoSelecionado}/${mesSelecionado}/sync/${timeId}`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        setSyncResultado((prev) => ({
          ...prev,
          [timeId]: json.aviso ?? `✓ ${json.cursos} cursos · ${json.entries_criadas} entradas`,
        }));
        if (mesSelecionado !== null) await loadDetalhe(anoSelecionado, mesSelecionado);
        await reloadPeriodos();
      } else {
        setSyncResultado((prev) => ({ ...prev, [timeId]: `Erro: ${json.error}` }));
      }
    } catch {
      setSyncResultado((prev) => ({ ...prev, [timeId]: "Erro de conexão" }));
    } finally {
      setSyncLoading((prev) => ({ ...prev, [timeId]: false }));
    }
  };

  const copiarTime = async (time: Time) => {
    if (!detalhe) return;
    const tsv = buildImobilizacaoTsv(time, detalhe.entries);
    if (!tsv) { alert("Nenhum dado para copiar neste time."); return; }

    function esc(s: string) {
      return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    const linhas = tsv.split("\n").map((l) => l.split("\t"));
    const htmlTabela = [
      "<table>",
      ...linhas.map((cols, i) =>
        `<tr>${cols.map((c) => i === 0 ? `<th>${esc(c)}</th>` : `<td>${esc(c)}</td>`).join("")}</tr>`
      ),
      "</table>",
    ].join("\n");

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([htmlTabela], { type: "text/html" }),
          "text/plain": new Blob([tsv], { type: "text/plain" }),
        }),
      ]);
    } catch {
      await navigator.clipboard.writeText(tsv).catch(() => {});
    }
    setCopied((prev) => ({ ...prev, [time.id]: true }));
    setTimeout(() => setCopied((prev) => ({ ...prev, [time.id]: false })), 2000);
  };

  const atualizarHorasLocal = (entryId: string, novoValor: number) => {
    setDetalhe((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        entries: prev.entries.map((e) => e.id === entryId ? { ...e, horas: novoValor } : e),
      };
    });
  };

  const [addCursoErro, setAddCursoErro] = useState<string | null>(null);

  const adicionarCurso = async () => {
    if (!addCursoNome.trim() || !timeAtivo || mesSelecionado === null) return;
    setAddCursoLoading(true);
    setAddCursoErro(null);
    try {
      const cols = timeAtivo.colaboradores.sort((a, b) => a.ordem - b.ordem);
      const results = await Promise.all(
        cols.map((col) =>
          fetch(`/api/imobilizacao/${anoSelecionado}/${mesSelecionado}/entries`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              colaboradorNome: col.nome,
              produtoTipo: "curso",
              produtoId: addCursoId.trim() || null,
              produtoNome: addCursoNome.trim(),
              horas: 0,
              timeId: timeAtivo.id,
            }),
          })
        )
      );
      if (results.some((r) => !r.ok)) {
        setAddCursoErro("Alguns lançamentos falharam. Tente novamente.");
        return;
      }
      setAddCursoOpen(false);
      setAddCursoNome("");
      setAddCursoId("");
      await loadDetalhe(anoSelecionado, mesSelecionado);
    } catch {
      setAddCursoErro("Erro de conexão.");
    } finally {
      setAddCursoLoading(false);
    }
  };

  const periodoAtual = periodos.find((p) => p.ano === anoSelecionado && p.mes === mesSelecionado);

  // Time ativo
  const timeAtivo = times.find((t) => t.id === timeSelecionadoId) ?? null;

  // Colaboradores e entries do time ativo
  const colaboradoresDoTime = timeAtivo
    ? timeAtivo.colaboradores.sort((a, b) => a.ordem - b.ordem)
    : [];

  const entriesDoTime = detalhe && timeAtivo
    ? detalhe.entries.filter((e) => e.timeId === timeAtivo.id)
    : detalhe?.entries ?? [];

  // Produtos únicos (do time ativo ou todos se sem times)
  type ProdutoKey = { tipo: string | null; id: string | null; nome: string };
  const produtosMap = new Map<string, ProdutoKey>();
  entriesDoTime.forEach((e) => {
    const key = `${e.produtoId ?? ""}__${e.produtoNome}`;
    if (!produtosMap.has(key)) produtosMap.set(key, { tipo: e.produtoTipo, id: e.produtoId, nome: e.produtoNome });
  });
  const produtos = [...produtosMap.entries()];

  // Colunas de colaboradores
  const colaboradoresGerais = timeAtivo
    ? colaboradoresDoTime
        .filter((c) => entriesDoTime.some((e) => e.colaboradorNome === c.nome))
        .map((c) => c.nome)
    : [...new Set(entriesDoTime.map((e) => e.colaboradorNome))].sort();

  const getEntry = (produtoKey: string, colab: string) =>
    entriesDoTime.find(
      (e) => `${e.produtoId ?? ""}__${e.produtoNome}` === produtoKey && e.colaboradorNome === colab
    ) ?? null;

  const totalPorColaborador = (colab: string) =>
    entriesDoTime.filter((e) => e.colaboradorNome === colab).reduce((s, e) => s + e.horas, 0);

  const totalGeral = entriesDoTime.reduce((s, e) => s + e.horas, 0);

  if (periodos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <CalendarRange size={48} className="text-muted-foreground" />
        <div>
          <p className="text-lg font-medium">Nenhum período cadastrado</p>
          <p className="text-sm text-muted-foreground mt-1">Crie o primeiro período para começar.</p>
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
      {/* Cabeçalho */}
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
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <Link href="/imobilizacao/configurar">
            <Button size="sm" variant="outline">
              <Settings size={14} className="mr-2" />
              Configurar Times
            </Button>
          </Link>
          <Button size="sm" onClick={() => setPeriodoDialogOpen(true)}>
            <Plus size={14} className="mr-2" />
            Novo Período
          </Button>
        </div>
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
                ? "bg-sidebar-accent text-foreground"
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
                    if (!periodoAtual) return;
                    setPeriodoParaEditar({
                      ano: periodoAtual.ano,
                      mes: periodoAtual.mes,
                      dataInicio: periodoAtual.dataInicio,
                      dataFim: periodoAtual.dataFim,
                      feriados: periodoAtual.feriados,
                      diasUteis: periodoAtual.diasUteis,
                    });
                    setPeriodoDialogOpen(true);
                  }}
                >
                  <Pencil size={14} className="mr-1" />
                  Editar
                </Button>
                <Button size="sm" variant="destructive" onClick={deletarPeriodo} disabled={deletandoPeriodo}>
                  <Trash2 size={14} className="mr-1" />
                  {deletandoPeriodo ? "Excluindo..." : "Excluir Período"}
                </Button>
              </div>
            </div>
          )}

          {/* Abas por time */}
          {times.length > 0 && (
            <div className="flex">
              {times.sort((a, b) => a.ordem - b.ordem).map((time) => (
                <button
                  key={time.id}
                  onClick={() => setTimeSelecionadoId(time.id)}
                  className={`px-5 py-4 text-xs font-mono font-semibold uppercase border border-sidebar-border -ml-px first:ml-0 transition-colors relative ${
                    timeSelecionadoId === time.id
                      ? "bg-[#0c0d0e] text-foreground border-t-foreground z-10"
                      : "bg-sidebar text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {time.nome}
                </button>
              ))}
            </div>
          )}

          {/* Painel de sync + copiar do time ativo */}
          {timeAtivo && (
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                disabled={syncLoading[timeAtivo.id] || !periodoAtual?.diasUteis}
                onClick={() => syncTime(timeAtivo.id)}
              >
                <RefreshCw
                  size={13}
                  className={`mr-1 ${syncLoading[timeAtivo.id] ? "animate-spin" : ""}`}
                />
                {syncLoading[timeAtivo.id] ? "Calculando..." : `Calcular ${timeAtivo.nome}`}
              </Button>

              {detalhe && entriesDoTime.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => copiarTime(timeAtivo)}>
                  {copied[timeAtivo.id] ? (
                    <><Check size={13} className="mr-1 text-green-600" />Copiado!</>
                  ) : (
                    <><Copy size={13} className="mr-1" />Copiar {timeAtivo.nome}</>
                  )}
                </Button>
              )}

              {syncResultado[timeAtivo.id] && (
                <span className={`text-xs ${
                  syncResultado[timeAtivo.id].startsWith("Erro")
                    ? "text-destructive"
                    : "text-green-600 dark:text-green-400"
                }`}>
                  {syncResultado[timeAtivo.id]}
                </span>
              )}

              {periodoAtual?.diasUteis === 0 && (
                <span className="text-xs text-muted-foreground">
                  ⚠️ Configure os dias úteis antes de calcular.
                </span>
              )}
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
          ) : detalhe && entriesDoTime.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="hub-table-header text-left px-2 py-1.5 w-16">Tipo</th>
                    <th className="hub-table-header text-left px-2 py-1.5 w-20">ID</th>
                    <th className="hub-table-header text-left px-2 py-1.5 min-w-40">Produto</th>
                    {colaboradoresGerais.map((c) => (
                      <th key={c} className="hub-table-header text-center px-1 py-1.5 whitespace-nowrap w-14">
                        {c}
                      </th>
                    ))}
                    <th className="hub-table-header text-center px-2 py-1.5 w-14">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Total por pessoa — primeira linha */}
                  <tr className="border-b bg-muted/30 font-semibold">
                    <td className="px-2 py-1.5 text-muted-foreground" colSpan={3}>Total por Pessoa</td>
                    {colaboradoresGerais.map((c) => (
                      <td key={c} className="px-2 py-1.5 text-center">{totalPorColaborador(c)}</td>
                    ))}
                    <td className="px-2 py-1.5 text-center">{totalGeral}</td>
                  </tr>

                  {/* Linhas de produtos */}
                  {produtos.map(([key, produto]) => {
                    const totalCurso = colaboradoresGerais.reduce(
                      (s, c) => s + (getEntry(key, c)?.horas ?? 0),
                      0
                    );
                    return (
                      <tr key={key} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-2 py-1 text-muted-foreground">{produto.tipo ?? "—"}</td>
                        <td className="px-2 py-1 text-muted-foreground">{produto.id ?? "—"}</td>
                        <td className="px-2 py-1 font-medium">{produto.nome}</td>
                        {colaboradoresGerais.map((c) => {
                          const entry = getEntry(key, c);
                          return (
                            <td key={c} className="px-0.5 py-0.5 text-center">
                              <CelulaHorasEditavel
                                entryId={entry?.id ?? null}
                                valor={entry?.horas ?? 0}
                                ano={anoSelecionado}
                                mes={mesSelecionado}
                                onSalvo={(novoValor) =>
                                  entry && atualizarHorasLocal(entry.id, novoValor)
                                }
                              />
                            </td>
                          );
                        })}
                        <td className="px-2 py-1 text-center font-semibold">{totalCurso > 0 ? totalCurso : "—"}</td>
                      </tr>
                    );
                  })}

                  {/* Linha de adicionar curso */}
                  {timeAtivo && (
                    <tr>
                      <td colSpan={3 + colaboradoresGerais.length + 1} className="px-2 py-1">
                        <button
                          onClick={() => setAddCursoOpen(true)}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Plus size={12} />
                          Adicionar curso manualmente
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-center border rounded-lg bg-muted/10">
              <p className="text-sm text-muted-foreground">
                {timeAtivo
                  ? `Nenhum dado para ${timeAtivo.nome} neste período.`
                  : "Nenhuma entry neste período."}
              </p>
              {timeAtivo && (
                <div className="flex gap-2">
                  {periodoAtual?.diasUteis ? (
                    <p className="text-xs text-muted-foreground">
                      Use o botão "Calcular" acima para importar do ClickUp.
                    </p>
                  ) : null}
                  <button
                    onClick={() => setAddCursoOpen(true)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Plus size={12} />
                    Adicionar curso manualmente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <PeriodoFormDialog
        open={periodoDialogOpen}
        periodo={periodoParaEditar ?? undefined}
        onOpenChange={(open) => {
          setPeriodoDialogOpen(open);
          if (!open) setPeriodoParaEditar(null);
        }}
        onSuccess={onPeriodoSuccess}
      />

      {/* Dialog para adicionar curso manualmente */}
      <Dialog open={addCursoOpen} onOpenChange={(open) => { setAddCursoOpen(open); if (!open) { setAddCursoNome(""); setAddCursoId(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar curso manualmente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="addCursoId">ID do curso</Label>
              <Input
                id="addCursoId"
                placeholder="Ex: 1234"
                value={addCursoId}
                onChange={(e) => setAddCursoId(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="addCursoNome">Nome do curso *</Label>
              <Input
                id="addCursoNome"
                placeholder="Ex: JavaScript para iniciantes"
                value={addCursoNome}
                onChange={(e) => setAddCursoNome(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") adicionarCurso(); }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Serão criadas entradas com 0h para cada colaborador de {timeAtivo?.nome ?? "este time"}.
            </p>
            {addCursoErro && <p className="text-xs text-destructive">{addCursoErro}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCursoOpen(false)} disabled={addCursoLoading}>
              Cancelar
            </Button>
            <Button onClick={adicionarCurso} disabled={!addCursoNome.trim() || addCursoLoading}>
              {addCursoLoading ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
