"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonthPicker } from "@/app/(dashboard)/gastos/_components/month-picker";

const CATEGORIES = [
  "Programação",
  "Front-end",
  "Data Science",
  "Inteligência Artificial",
  "DevOps",
  "UX & Design",
  "Mobile",
  "Inovação & Gestão",
];

interface Course {
  id: string;
  slug: string;
  nome: string;
  categoria: string | null;
  instrutores: string[];
  cargaHoraria: number | null;
  dataCriacao: string | null;
  dataAtualizacao: string | null;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function CursosTab({ isAdmin }: { isAdmin: boolean }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string>("");
  const [monthFrom, setMonthFrom] = useState("2025-01");
  const [monthTo, setMonthTo] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (monthFrom) params.set("month_from", monthFrom);
    if (monthTo) params.set("month_to", monthTo);
    if (selectedCat) params.set("categoria", selectedCat);
    const res = await fetch(`/api/publicacoes/cursos?${params}`);
    const data = await res.json();
    setCourses(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [monthFrom, monthTo, selectedCat]);

  useEffect(() => { load(); }, [load]);

  async function handleSync() {
    setSyncing(true);
    setSyncResult("");
    try {
      const res = await fetch("/api/publicacoes/cursos/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSyncResult(data.error || "Erro ao sincronizar");
        return;
      }
      setSyncResult(
        `${data.slugsFound} cursos encontrados · ${data.newCoursesProcessed} novos · ${data.existingUpdated} atualizados`
      );
      load();
    } catch {
      setSyncResult("Erro de conexão");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Filtros de data + botão sync */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">De</span>
          <MonthPicker value={monthFrom} onChange={setMonthFrom} placeholder="Início" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Até</span>
          <MonthPicker value={monthTo} onChange={setMonthTo} placeholder="Fim" />
        </div>
        {(monthFrom || monthTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setMonthFrom(""); setMonthTo(""); }}>
            Limpar tudo
          </Button>
        )}

        {isAdmin && (
          <div className="ml-auto flex items-center gap-3">
            <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}>
              <RefreshCw size={14} className={cn("mr-2", syncing && "animate-spin")} />
              {syncing ? "Sincronizando..." : "Sincronizar"}
            </Button>
            {syncResult && <p className="text-xs text-muted-foreground">{syncResult}</p>}
          </div>
        )}
      </div>

      {/* Filtros de categoria */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCat("")}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
            selectedCat === ""
              ? "bg-primary text-primary-foreground border-transparent"
              : "bg-transparent text-muted-foreground border-border hover:border-foreground"
          )}
        >
          Todas
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(selectedCat === cat ? "" : cat)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
              selectedCat === cat
                ? "bg-primary text-primary-foreground border-transparent"
                : "bg-transparent text-muted-foreground border-border hover:border-foreground"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tabela */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-12">Carregando...</p>
      ) : courses.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground text-sm">
          {isAdmin
            ? 'Nenhum curso encontrado. Clique em "Sincronizar" para buscar os cursos da Alura.'
            : "Nenhum curso encontrado para os filtros selecionados."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left pb-2 font-medium text-muted-foreground pr-4">Nome</th>
                <th className="text-left pb-2 font-medium text-muted-foreground px-3">Instrutor(es)</th>
                <th className="text-right pb-2 font-medium text-muted-foreground px-3">Publicação</th>
                <th className="text-right pb-2 font-medium text-muted-foreground pl-3">Atualização</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {courses.map((course) => (
                <tr key={course.id}>
                  <td className="py-2.5 pr-4">
                    <a
                      href={`https://www.alura.com.br/curso-online-${course.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-primary transition-colors flex items-start gap-1.5 group"
                    >
                      {course.nome}
                      <ExternalLink size={11} className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    {course.categoria && (
                      <span className="text-xs text-muted-foreground">{course.categoria}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">
                    {course.instrutores.length > 0 ? course.instrutores.join(", ") : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground font-mono text-xs">
                    {formatDate(course.dataCriacao)}
                  </td>
                  <td className="py-2.5 pl-3 text-right text-muted-foreground font-mono text-xs">
                    {formatDate(course.dataAtualizacao)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-3">{courses.length} cursos</p>
        </div>
      )}
    </div>
  );
}
