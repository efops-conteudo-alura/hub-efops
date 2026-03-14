"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil, CalendarRange, Copy, Check, RefreshCw, Settings } from "lucide-react";
import { PeriodoFormDialog } from "./periodo-form-dialog";
import { EntryFormDialog, type EntryData } from "./entry-form-dialog";
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
  ignorar: boolean;
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

// Constrói TSV no formato da planilha de imobilização
function buildImobilizacaoTsv(
  time: Time,
  entries: Entry[]
): string {
  // Colaboradores do time em ordem (excluindo ignorados)
  const colaboradores = time.colaboradores
    .filter((c) => !c.ignorar)
    .sort((a, b) => a.ordem - b.ordem);

  // Filtra entries deste time
  const entriesDoTime = entries.filter((e) => e.timeId === time.id);

  // Monta mapa: produtoKey → (colaborador → horas)
  type ProdKey = { id: string; nome: string; key: string };
  const produtoMap = new Map<string, ProdKey>();
  const horasMap = new Map<string, Map<string, number>>(); // prodKey → colab → horas

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

  // Linha "Total por Pessoa"
  const totaisPorPessoa = nomes.map((nome) =>
    produtos.reduce((s, p) => s + (horasMap.get(p.key)?.get(nome) ?? 0), 0)
  );
  const grandTotal = totaisPorPessoa.reduce((s, v) => s + v, 0);
  const totalRow = ["", "Total por Pessoa", ...totaisPorPessoa, grandTotal].join("\t");

  // Linhas de produtos
  const rows = produtos.map((p) => {
    const horasPorPessoa = nomes.map((nome) => horasMap.get(p.key)?.get(nome) ?? "");
    const totalCurso = nomes.reduce((s, nome) => s + (horasMap.get(p.key)?.get(nome) ?? 0), 0);
    return [p.id, p.nome, ...horasPorPessoa, totalCurso].join("\t");
  });

  return [header, totalRow, ...rows].join("\n");
}

// Célula editável inline de horas
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
    if (editando && inputRef.current) {
      inputRef.current.select();
    }
  }, [editando]);

  const salvar = async () => {
    if (!entryId) { setEditando(false); return; }
    const novoValor = parseInt(input, 10);
    if (isNaN(novoValor) || novoValor < 0) { setEditando(false); setInput(String(valor)); return; }
    if (novoValor === valor) { setEditando(false); return; }

    setSalvando(true);
    try {
      await fetch(`/api/imobilizacao/${ano}/${mes}/entries/${entryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ horas: novoValor }),
      });
      onSalvo(novoValor);
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
        className="w-14 text-center text-sm border rounded px-1 py-0.5 bg-background"
        disabled={salvando}
      />
    );
  }

  return (
    <button
      onClick={() => { setEditando(true); setInput(String(valor)); }}
      className={`w-full text-center px-1 rounded hover:bg-muted/50 transition-colors ${
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
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [entryEditando, setEntryEditando] = useState<EntryData | null>(null);

  // Sync por time
  const [syncLoading, setSyncLoading] = useState<Record<string, boolean>>({});
  const [syncResultado, setSyncResultado] = useState<Record<string, string>>({});

  // Copy por time
  const [copied, setCopied] = useState<Record<string, boolean>>({});

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
    if (!res.ok) { alert("Erro ao excluir o lançamento."); return; }
    await onEntrySuccess();
  };

  const deletarPeriodo = async () => {
    if (!mesSelecionado) return;
    if (!confirm("Excluir o período e todos os lançamentos? Essa ação não pode ser desfeita.")) return;
    const res = await fetch(`/api/imobilizacao/${anoSelecionado}/${mesSelecionado}`, { method: "DELETE" });
    if (!res.ok) { alert("Erro ao excluir o período."); return; }
    await reloadPeriodos();
    setMesSelecionado(null);
    setDetalhe(null);
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
        await onEntrySuccess();
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

    // Gera HTML da tabela para colagem com formatação
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

  // Atualiza horas de uma entry no estado local (sem reload)
  const atualizarHorasLocal = (entryId: string, novoValor: number) => {
    setDetalhe((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        entries: prev.entries.map((e) =>
          e.id === entryId ? { ...e, horas: novoValor } : e
        ),
      };
    });
  };

  // Pivot table: colaboradores únicos (para tabela geral)
  const colaboradoresGerais = detalhe
    ? [...new Set(detalhe.entries.map((e) => e.colaboradorNome))].sort()
    : [];

  type ProdutoKey = { tipo: string | null; id: string | null; nome: string };
  const produtosMap = new Map<string, ProdutoKey>();
  detalhe?.entries.forEach((e) => {
    const key = `${e.produtoId ?? ""}__${e.produtoNome}`;
    if (!produtosMap.has(key)) produtosMap.set(key, { tipo: e.produtoTipo, id: e.produtoId, nome: e.produtoNome });
  });
  const produtos = [...produtosMap.entries()];

  const getEntry = (produtoKey: string, colab: string) =>
    detalhe?.entries.find(
      (e) => `${e.produtoId ?? ""}__${e.produtoNome}` === produtoKey && e.colaboradorNome === colab
    ) ?? null;

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
      {/* Cabeçalho: seletor de ano + link configurações + novo período */}
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
                  onClick={() => { setEntryEditando(null); setEntryDialogOpen(true); }}
                >
                  <Plus size={14} className="mr-1" />
                  Lançamento Manual
                </Button>
                <Button size="sm" variant="destructive" onClick={deletarPeriodo}>
                  <Trash2 size={14} className="mr-1" />
                  Excluir Período
                </Button>
              </div>
            </div>
          )}

          {/* Painel de sync por time */}
          {times.length > 0 && (
            <div className="p-3 rounded-lg border space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Calcular via ClickUp</p>
              <div className="flex flex-wrap gap-2">
                {times
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((time) => (
                    <div key={time.id} className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={syncLoading[time.id] || !periodoAtual?.diasUteis}
                        onClick={() => syncTime(time.id)}
                      >
                        <RefreshCw
                          size={13}
                          className={`mr-1 ${syncLoading[time.id] ? "animate-spin" : ""}`}
                        />
                        {syncLoading[time.id] ? "Calculando..." : `Calcular ${time.nome}`}
                      </Button>
                      {syncResultado[time.id] && (
                        <span
                          className={`text-xs ${
                            syncResultado[time.id].startsWith("Erro")
                              ? "text-destructive"
                              : "text-green-600 dark:text-green-400"
                          }`}
                        >
                          {syncResultado[time.id]}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
              {periodoAtual?.diasUteis === 0 && (
                <p className="text-xs text-muted-foreground">
                  ⚠️ Configure os dias úteis no período antes de calcular.
                </p>
              )}
            </div>
          )}

          {/* Botões de cópia por time */}
          {times.length > 0 && detalhe && detalhe.entries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {times
                .filter((t) => detalhe.entries.some((e) => e.timeId === t.id))
                .sort((a, b) => a.ordem - b.ordem)
                .map((time) => (
                  <Button
                    key={time.id}
                    size="sm"
                    variant="outline"
                    onClick={() => copiarTime(time)}
                  >
                    {copied[time.id] ? (
                      <><Check size={13} className="mr-1 text-green-600" />Copiado!</>
                    ) : (
                      <><Copy size={13} className="mr-1" />Copiar {time.nome}</>
                    )}
                  </Button>
                ))}
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
                    {colaboradoresGerais.map((c) => (
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
                    const totalCurso = colaboradoresGerais.reduce(
                      (s, c) => s + (getEntry(key, c)?.horas ?? 0),
                      0
                    );
                    const firstEntry = detalhe.entries.find(
                      (e) => `${e.produtoId ?? ""}__${e.produtoNome}` === key
                    );
                    return (
                      <tr key={key} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2 text-muted-foreground">{produto.tipo ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{produto.id ?? "—"}</td>
                        <td className="px-3 py-2 font-medium">{produto.nome}</td>
                        {colaboradoresGerais.map((c) => {
                          const entry = getEntry(key, c);
                          return (
                            <td key={c} className="px-1 py-1 text-center">
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
                        <td className="px-3 py-2 text-center font-semibold">{totalCurso > 0 ? totalCurso : "—"}</td>
                        <td className="px-2 py-2">
                          {firstEntry && (
                            <div className="flex gap-1 justify-end">
                              <button
                                title="Editar"
                                onClick={() => {
                                  setEntryEditando(firstEntry);
                                  setEntryDialogOpen(true);
                                }}
                                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                title="Excluir"
                                onClick={() => deletarEntry(firstEntry.id)}
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
                    {colaboradoresGerais.map((c) => (
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
              <div className="flex gap-2">
                {times.length > 0 && periodoAtual?.diasUteis ? (
                  <p className="text-xs text-muted-foreground">
                    Use os botões "Calcular" acima para importar do ClickUp, ou adicione manualmente.
                  </p>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEntryEditando(null); setEntryDialogOpen(true); }}
                  >
                    <Plus size={14} className="mr-1" />
                    Adicionar Lançamento
                  </Button>
                )}
              </div>
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
