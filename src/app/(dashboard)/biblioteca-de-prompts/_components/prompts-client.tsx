"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Check, Copy, Trash2, Search, BookText } from "lucide-react"
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

function PromptCard({ prompt, userId, isAdmin, onDeleted, onUpdated }: {
  prompt: Prompt
  userId: string
  isAdmin: boolean
  onDeleted: (id: string) => void
  onUpdated: () => void
}) {
  const [copiado, setCopiado] = useState(false)
  const [deletando, setDeletando] = useState(false)

  const podeExcluir = isAdmin || prompt.autorId === userId

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
      if (res.ok) onDeleted(prompt.id)
    } finally {
      setDeletando(false)
    }
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-tight flex-1">{prompt.titulo}</p>
          <div className="flex items-center gap-1 shrink-0">
            <PromptFormDialog prompt={prompt} onSuccess={onUpdated} />
            {podeExcluir && (
              <button
                onClick={excluir}
                disabled={deletando}
                className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                title="Excluir prompt"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        {prompt.categoria && (
          <Badge variant="secondary" className="text-xs w-fit">{prompt.categoria}</Badge>
        )}
        {prompt.descricao && (
          <p className="text-xs text-muted-foreground line-clamp-2">{prompt.descricao}</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 pt-0">
        <pre className="text-xs bg-muted/60 rounded-md p-3 overflow-hidden line-clamp-5 whitespace-pre-wrap font-mono flex-1">
          {prompt.conteudo}
        </pre>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {prompt.autorNome} · {new Date(prompt.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
          <Button size="sm" variant="outline" onClick={copiar} className="h-7 text-xs gap-1.5">
            {copiado ? <Check size={13} /> : <Copy size={13} />}
            {copiado ? "Copiado!" : "Copiar"}
          </Button>
        </div>
      </CardContent>
    </Card>
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
          <h1 className="text-2xl font-bold">Biblioteca de Prompts</h1>
          <p className="text-muted-foreground text-sm">
            {prompts.length} prompt{prompts.length !== 1 ? "s" : ""} · compartilhados pelo time
          </p>
        </div>
        <PromptFormDialog
          onSuccess={() => router.refresh()}
        />
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
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
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
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
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
            <p className="text-lg font-medium">Nenhum prompt encontrado para "{busca}"</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              userId={userId}
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
