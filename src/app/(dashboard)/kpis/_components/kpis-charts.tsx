"use client";

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { type KpiProducao } from "./producao-form-dialog";
import { type KpiEdicao } from "./edicao-form-dialog";
import { calcScoreProducao, fmtMonthShort } from "./producao-table";
import { calcScoreEdicao, totalEntregas } from "./edicao-table";

interface Pesos {
  curso: number; artigo: number; carreira: number; nivel: number; trilha: number;
}

interface KpisChartsProps {
  producao: KpiProducao[];
  edicao: KpiEdicao[];
  pesos: Pesos;
}

function mm3(scores: number[], idx: number): number | null {
  if (idx < 2) return null;
  return Math.round((scores[idx - 2] + scores[idx - 1] + scores[idx]) / 3);
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <p className="text-sm font-semibold">{title}</p>
      {children}
    </div>
  );
}

const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 6 };

export function KpisCharts({ producao, edicao, pesos }: KpisChartsProps) {
  // --- Produção ---
  const sortedProd = [...producao].sort((a, b) => a.month.localeCompare(b.month));
  const prodScores = sortedProd.map((r) => calcScoreProducao(r, pesos));

  const prodQtyData = sortedProd.map((r) => ({
    month: fmtMonthShort(r.month),
    Cursos: r.cursos,
    Artigos: r.artigos,
    Carreiras: r.carreiras,
    Níveis: r.niveis,
    Trilhas: r.trilhas,
  }));

  const prodScoreData = sortedProd.map((r, i) => ({
    month: fmtMonthShort(r.month),
    "Score": prodScores[i],
    "MM 3 meses": mm3(prodScores, i),
  }));

  // --- Edição ---
  const sortedEd = [...edicao].sort((a, b) => a.month.localeCompare(b.month));

  const edEntregasData = sortedEd.map((r) => ({
    month: fmtMonthShort(r.month),
    Conteúdo: r.entregasConteudo,
    Start: r.entregasStart,
    Latam: r.entregasLatam,
    Marketing: r.entregasMarketing,
    Outras: r.entregasOutras,
  }));

  const edScoreData = sortedEd.map((r) => ({
    month: fmtMonthShort(r.month),
    "Score Edição": calcScoreEdicao(r),
    "Total Entregas": totalEntregas(r),
    "Correções": r.correcoes,
  }));

  const noDataMsg = <p className="text-sm text-muted-foreground text-center py-8">Sem dados suficientes</p>;

  return (
    <div className="space-y-6">
      {/* Publicação */}
      <div>
        <p className="text-base font-semibold mb-3">Publicação de Conteúdo</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Quantidade publicada por categoria">
            {sortedProd.length === 0 ? noDataMsg : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={prodQtyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Cursos" stackId="a" fill="#6366f1" radius={[0,0,0,0]} />
                  <Bar dataKey="Artigos" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="Carreiras" stackId="a" fill="#10b981" />
                  <Bar dataKey="Níveis" stackId="a" fill="#f43f5e" />
                  <Bar dataKey="Trilhas" stackId="a" fill="#8b5cf6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="Score de publicação">
            {sortedProd.length === 0 ? noDataMsg : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={prodScoreData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Score" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  <Line type="monotone" dataKey="MM 3 meses" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      </div>

      {/* Edição */}
      <div>
        <p className="text-base font-semibold mb-3">Pós-produção</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Entregas por tipo">
            {sortedEd.length === 0 ? noDataMsg : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={edEntregasData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Conteúdo" stackId="b" fill="#6366f1" />
                  <Bar dataKey="Start" stackId="b" fill="#f59e0b" />
                  <Bar dataKey="Latam" stackId="b" fill="#10b981" />
                  <Bar dataKey="Marketing" stackId="b" fill="#f43f5e" />
                  <Bar dataKey="Outras" stackId="b" fill="#8b5cf6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="Score de edição + entregas vs correções">
            {sortedEd.length === 0 ? noDataMsg : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={edScoreData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="Score Edição" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Total Entregas" stroke="#10b981" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="Correções" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
