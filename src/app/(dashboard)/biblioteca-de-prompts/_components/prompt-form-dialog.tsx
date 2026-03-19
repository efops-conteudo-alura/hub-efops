"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, Plus } from "lucide-react"

interface Prompt {
  id: string
  titulo: string
  descricao: string | null
  conteudo: string
  categoria: string | null
}

interface Props {
  prompt?: Prompt
  onSuccess: () => void
}

export function PromptFormDialog({ prompt, onSuccess }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    titulo: prompt?.titulo ?? "",
    descricao: prompt?.descricao ?? "",
    conteudo: prompt?.conteudo ?? "",
    categoria: prompt?.categoria ?? "",
  })

  const isEdit = !!prompt

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.titulo.trim() || !form.conteudo.trim()) return
    setLoading(true)
    try {
      const url = isEdit ? `/api/biblioteca-de-prompts/${prompt.id}` : "/api/biblioteca-de-prompts"
      const method = isEdit ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setOpen(false)
        if (!isEdit) setForm({ titulo: "", descricao: "", conteudo: "", categoria: "" })
        onSuccess()
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <button className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors" title="Editar prompt">
            <Pencil size={14} />
          </button>
        ) : (
          <Button size="sm">
            <Plus size={16} className="mr-1" />
            Novo Prompt
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Prompt" : "Novo Prompt"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex: Validar ementa de curso"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="categoria">Categoria</Label>
            <Input
              id="categoria"
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              placeholder="Ex: Ementa, Pesquisa, Relatório"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="descricao">Descrição <span className="text-muted-foreground">(quando usar)</span></Label>
            <Input
              id="descricao"
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Para que serve este prompt?"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="conteudo">Conteúdo do Prompt *</Label>
            <Textarea
              id="conteudo"
              value={form.conteudo}
              onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
              placeholder="Escreva o prompt aqui..."
              rows={8}
              className="font-mono text-sm"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !form.titulo.trim() || !form.conteudo.trim()}>
              {loading ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
