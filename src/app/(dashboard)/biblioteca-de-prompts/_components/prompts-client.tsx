"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Check, Copy, Trash2, Search, BookText, Eye, Pencil, Loader2 } from "lucide-react"
import { PromptFormDialog } from "./prompt-form-dialog"

interface Prompt {
  id: string
  titulo: string
  descricao: string | null
  conteudo: string
  categoria: string | null
  autorNome: string
  autorId: string
  createdAt: string
}

interface Props {
  prompts: Prompt[]
  userId: string
  isAdmin: boolean
}

function PromptCard({
  prompt,
  isAdmin,
  onDeleted,
  onUpdated,
}: {
  prompt: Prompt
  isAdmin: boolean
  onDeleted: (id: string) => void
  onUpdated: () => void
}) {
  const [viewOpen, setViewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [deletando, setDeletando] = useState(false)

  async function copiar() {
    await navigator.clipboard.writeText(prompt.conteudo)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function excluir() {
    if (!confirm(`Excluir o prompt "${prompt.titulo}"?`)) return
    setDeletando(true)
    try {
      const res = await fetch(`/api/biblioteca-de-prompts/${prompt.id}`, { method: "DELETE" })
      if (res.ok) {
        setViewOpen(false)
        onDeleted(prompt.id)
      }
    } finally {
      setDeletando(false)
    }
  }

  function abrirEdicao() {
    setViewOpen(false)
    // pequeno delay para a animação de fechar o view dialog terminar
    setTimeout(() => setEditOpen(true), 150)
  }

  return (
    <>
      {/* Card */}
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-2 space-y-1.5">
          <p className="hub-card-title leading-tight">{prompt.titulo}</p>
          {prompt.categoria && (
            <Badge variant="secondary" className="text-xs w-fit font-mono uppercase tracking-wider">{prompt.categoria}</Badge>
          )}
          {prompt.descricao && (
            <p className="text-xs text-muted-foreground line-clamp-2">{prompt.descricao}</p>
          )}
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-end gap-2 pt-0">
          <p className="text-xs text-muted-foreground">
            {prompt.autorNome} · {new Date(prompt.createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs gap-1.5"
            onClick={() => setViewOpen(true)}
          >
            <Eye size={13} />
            Visualizar
          </Button>
        </CardContent>
      </Card>

      {/* Dialog: Visualizar */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-[80vw] max-h-[80vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>{prompt.titulo}</DialogTitle>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              {prompt.categoria && (
                <Badge variant="secondary" className="text-xs font-mono uppercase tracking-wider">{prompt.categoria}</Badge>
              )}
              {prompt.descricao && (
                <span className="text-xs text-muted-foreground">{prompt.descricao}</span>
              )}
            </div>
          </DialogHeader>

          {/* Conteúdo scrollável */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <pre className="text-xs bg-muted/60 rounded-md p-4 whitespace-pre-wrap font-mono leading-relaxed">
              {prompt.conteudo}
            </pre>
          </div>

          {/* Footer com ações */}
          <div className="shrink-0 flex items-center justify-between pt-3 border-t mt-2">
            <p className="text-xs text-muted-foreground">
              {prompt.autorNome} · {new Date(prompt.createdAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive"
                  onClick={excluir}
                  disabled={deletando}
                >
                  {deletando ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                  Excluir
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={abrirEdicao}
              >
                <Pencil size={13} />
                Editar
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={copiar}
              >
                {copiado ? (
                  <><Check size={13} />Copiado!</>
                ) : (
                  <><Copy size={13} />Copiar</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar (controlado) — ao fechar, reabre visualização */}
      <PromptFormDialog
        prompt={prompt}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setTimeout(() => setViewOpen(true), 100)
        }}
        onSuccess={onUpdated}
      />
    </>
  )
}

export function PromptsClient({ prompts: initial, userId, isAdmin }: Props) {
  const router = useRouter()
  const [prompts, setPrompts] = useState<Prompt[]>(initial)
  const [busca, setBusca] = useState("")
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null)

  const categorias = useMemo(
    () => [...new Set(prompts.map((p) => p.categoria).filter(Boolean) as string[])].sort(),
    [prompts]
  )

  const filtrados = useMemo(() => {
    return prompts.filter((p) => {
      const matchBusca =
        !busca ||
        p.titulo.toLowerCase().includes(busca.toLowerCase()) ||
        p.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
        p.conteudo.toLowerCase().includes(busca.toLowerCase())
      const matchCategoria = !categoriaAtiva || p.categoria === categoriaAtiva
      return matchBusca && matchCategoria
    })
  }, [prompts, busca, categoriaAtiva])

  function handleDeleted(id: string) {
    setPrompts((prev) => prev.filter((p) => p.id !== id))
  }

  function handleUpdated() {
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="hub-page-title">Biblioteca de Prompts</h1>
          <p className="text-muted-foreground text-sm">
            {prompts.length} prompt{prompts.length !== 1 ? "s" : ""} · compartilhados pelo time
          </p>
        </div>
        <PromptFormDialog onSuccess={() => router.refresh()} />
      </div>

      {/* Filtros */}
      {prompts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar prompts..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          {categorias.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategoriaAtiva(null)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors font-mono uppercase ${
                  !categoriaAtiva
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                Todos
              </button>
              {categorias.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoriaAtiva(cat === categoriaAtiva ? null : cat)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors font-mono uppercase ${
                    categoriaAtiva === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground gap-3">
          <BookText size={48} className="opacity-20" />
          {prompts.length === 0 ? (
            <>
              <p className="text-lg font-medium">Nenhum prompt cadastrado</p>
              <p className="text-sm">Seja o primeiro a adicionar um prompt à biblioteca</p>
            </>
          ) : (
            <p className="text-lg font-medium">Nenhum prompt encontrado para &quot;{busca}&quot;</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtrados.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              isAdmin={isAdmin}
              onDeleted={handleDeleted}
              onUpdated={handleUpdated}
            />
          ))}
        </div>
      )}
    </div>
  )
}
