import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp, BookOpen, FileBarChart, Sparkles, Key, Pencil,
  DollarSign, Clock, ArrowRight,
} from "lucide-react";
import { UsefulLinks } from "./_components/useful-links";

const MODULES = [
  { href: "/kpis", label: "KPIs de Conteúdo", desc: "Indicadores mensais de publicação e edição.", icon: TrendingUp },
  { href: "/publicacoes", label: "Publicações", desc: "Catálogo de cursos, trilhas, artigos e carreiras.", icon: BookOpen },
  { href: "/relatorios", label: "Relatórios", desc: "Builder de formulários e análise com IA.", icon: FileBarChart },
  { href: "/biblioteca-de-prompts", label: "Biblioteca de Prompts", desc: "Prompts compartilhados pelo time.", icon: Sparkles },
  { href: "/licencas", label: "Licenças", desc: "Gestão de assinaturas e ferramentas.", icon: Key },
  { href: "/briefing", label: "Briefing para Marketing", desc: "Geração de briefings para o time de marketing.", icon: Pencil },
];

const ADMIN_MODULES = [
  { href: "/gastos", label: "Gastos", desc: "Controle de despesas do departamento.", icon: DollarSign },
  { href: "/imobilizacao", label: "Imobilização", desc: "Controle de horas imobilizadas por colaborador.", icon: Clock },
];

export default async function HomePage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const [recentPrompts, recentReports, usefulLinks] = await Promise.all([
    prisma.prompt.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, titulo: true, categoria: true, autorNome: true, createdAt: true },
    }),
    prisma.report.findMany({
      where: isAdmin ? {} : { isAdminOnly: false },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, title: true, createdAt: true },
    }),
    prisma.usefulLink.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div>
        <h1 className="hub-page-title">Hub de Eficiência Operacional</h1>
        <p className="hub-section-title">Departamento de Conteúdo — Alura</p>
      </div>

      {/* Grid de módulos */}
      <div>
        <h2 className="text-xs text-muted-foreground uppercase tracking-wide mb-4">Módulos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODULES.map(({ href, label, desc, icon: Icon }) => (
            <Link key={href} href={href}>
              <div className="flex items-center gap-4 px-5 py-7 rounded-lg border border-sidebar-border border-l-4 border-l-border bg-card hover:bg-secondary/30 transition-colors cursor-pointer h-full min-h-[90px]">
                <Icon size={20} className="text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p
                    className="leading-tight mb-1 text-base text-foreground"
                    style={{ fontFamily: "var(--font-encode-sans)", fontWeight: 300 }}
                  >
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Módulos admin */}
      {isAdmin && (
        <div>
          <h2 className="text-xs text-muted-foreground uppercase tracking-wide mb-4">Gestão</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ADMIN_MODULES.map(({ href, label, desc, icon: Icon }) => (
              <Link key={href} href={href}>
                <div className="flex items-center gap-4 px-5 py-7 rounded-lg border border-sidebar-border border-l-4 border-l-border bg-card hover:bg-secondary/30 transition-colors cursor-pointer h-full min-h-[90px]">
                  <Icon size={20} className="text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p
                      className="leading-tight mb-1 text-base text-foreground"
                      style={{ fontFamily: "var(--font-encode-sans)", fontWeight: 300 }}
                    >
                      {label}
                    </p>
                    <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Últimos prompts */}
        <Card className="border-t-[3px] border-t-primary">
          <CardHeader className="pb-3">
            <CardTitle className="hub-card-title flex items-center gap-2">
              <Sparkles size={15} className="text-muted-foreground" />
              Últimos prompts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPrompts.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum prompt cadastrado.</p>
            ) : (
              <div className="space-y-3">
                {recentPrompts.map((p) => (
                  <div key={p.id} className="min-w-0">
                    <p className="text-sm truncate">{p.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.categoria ? `${p.categoria} · ` : ""}{p.autorNome}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <Link href="/biblioteca-de-prompts" className="flex items-center gap-1 mt-4 text-xs text-muted-foreground hover:underline">
              Ver todos <ArrowRight size={11} />
            </Link>
          </CardContent>
        </Card>

        {/* Últimos relatórios */}
        <Card className="border-t-[3px] border-t-primary">
          <CardHeader className="pb-3">
            <CardTitle className="hub-card-title flex items-center gap-2">
              <FileBarChart size={15} className="text-muted-foreground" />
              Últimos relatórios
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentReports.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum relatório cadastrado.</p>
            ) : (
              <div className="space-y-3">
                {recentReports.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2">
                    <p className="text-sm truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground shrink-0 hub-number">
                      {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <Link href="/relatorios" className="flex items-center gap-1 mt-4 text-xs text-muted-foreground hover:underline">
              Ver todos <ArrowRight size={11} />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Links úteis */}
      <UsefulLinks initialLinks={usefulLinks} isAdmin={isAdmin} />
    </div>
  );
}
