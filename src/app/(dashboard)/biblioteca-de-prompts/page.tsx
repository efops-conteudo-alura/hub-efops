import { BookText, Sparkles } from "lucide-react"

export default function BibliotecaDePromptsPage() {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
      <div className="p-4 rounded-2xl bg-primary/10">
        <BookText size={48} className="text-primary" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Biblioteca de Prompts</h1>
        <p className="text-muted-foreground max-w-md">
          Um espaço colaborativo para catalogar, melhorar e compartilhar os prompts usados pelo time.
          As pessoas poderão sugerir melhorias, votar e contribuir com versões aprimoradas.
        </p>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2 rounded-full">
        <Sparkles size={14} />
        Em construção
      </div>
    </div>
  )
}
