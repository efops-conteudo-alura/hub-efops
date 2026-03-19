"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search } from "lucide-react";
import { ResultadoPesquisa } from "./resultado-pesquisa";

const EIXOS_OPCOES = [
  { id: "ementa", label: "Ementa e conteúdo" },
  { id: "precificacao", label: "Precificação" },
  { id: "publico", label: "Público-alvo" },
  { id: "formato", label: "Formato" },
  { id: "cargaHoraria", label: "Carga horária" },
  { id: "diferenciais", label: "Diferenciais de posicionamento" },
];

interface Resultado {
  id: string;
  resultado: string;
}

export function PesquisaForm({ onNovaPesquisa }: { onNovaPesquisa: (p: { id: string; assunto: string; tipoConteudo: string; tipoPesquisa: string; autorNome: string; createdAt: string; resultado: string }) => void }) {
  const [assunto, setAssunto] = useState("");
  const [tipoConteudo, setTipoConteudo] = useState("");
  const [tipoPesquisa, setTipoPesquisa] = useState("");
  const [nivel, setNivel] = useState("");
  const [focoGeo, setFocoGeo] = useState("");
  const [eixos, setEixos] = useState<string[]>([]);
  const [plataformas, setPlataformas] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function toggleEixo(id: string) {
    setEixos((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assunto.trim() || !tipoConteudo || !tipoPesquisa || !nivel || !focoGeo || eixos.length === 0) return;

    setLoading(true);
    setErro(null);
    setResultado(null);

    try {
      const res = await fetch("/api/pesquisa-mercado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assunto, tipoConteudo, tipoPesquisa, nivel, eixos, focoGeo, plataformas }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao realizar a pesquisa");
      }

      const data = await res.json();
      setResultado(data);
      onNovaPesquisa({
        id: data.id,
        assunto,
        tipoConteudo,
        tipoPesquisa,
        autorNome: "Você",
        createdAt: new Date().toISOString(),
        resultado: data.resultado,
      });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  const podeSalvar = assunto.trim() && tipoConteudo && tipoPesquisa && nivel && focoGeo && eixos.length > 0;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl">
        <div className="space-y-1.5">
          <Label htmlFor="assunto">Nome / Assunto</Label>
          <Input
            id="assunto"
            placeholder="Ex: Claude Code, Carreira Front-end React"
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Tipo de conteúdo</Label>
            <Select value={tipoConteudo} onValueChange={setTipoConteudo} disabled={loading}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Curso">Curso</SelectItem>
                <SelectItem value="Carreira">Carreira</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de pesquisa</Label>
            <Select value={tipoPesquisa} onValueChange={setTipoPesquisa} disabled={loading}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Benchmark">Benchmark de Concorrentes</SelectItem>
                <SelectItem value="Tendencias">Tendências de Mercado</SelectItem>
                <SelectItem value="Ambos">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Nível</Label>
            <Select value={nivel} onValueChange={setNivel} disabled={loading}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Iniciante">Iniciante</SelectItem>
                <SelectItem value="Intermediario">Intermediário</SelectItem>
                <SelectItem value="Avancado">Avançado</SelectItem>
                <SelectItem value="Todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Foco geográfico</Label>
            <Select value={focoGeo} onValueChange={setFocoGeo} disabled={loading}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Brasil">Brasil</SelectItem>
                <SelectItem value="AmericaLatina">América Latina</SelectItem>
                <SelectItem value="Global">Global</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Eixos de análise</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {EIXOS_OPCOES.map((eixo) => (
              <label key={eixo.id} className="flex items-center gap-2 cursor-pointer text-sm">
                <Checkbox
                  checked={eixos.includes(eixo.id)}
                  onCheckedChange={() => toggleEixo(eixo.id)}
                  disabled={loading}
                />
                {eixo.label}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="plataformas">Plataformas específicas <span className="text-muted-foreground">(opcional)</span></Label>
          <Input
            id="plataformas"
            placeholder="Ex: Rocketseat, DIO, Platzi"
            value={plataformas}
            onChange={(e) => setPlataformas(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading || !podeSalvar}>
            {loading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Pesquisando o mercado... isso pode levar até 1 minuto
              </>
            ) : (
              <>
                <Search size={16} className="mr-2" />
                Pesquisar Mercado
              </>
            )}
          </Button>
        </div>
      </form>

      {erro && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive max-w-3xl">
          {erro}
        </div>
      )}

      {resultado && (
        <ResultadoPesquisa resultado={resultado.resultado} />
      )}
    </div>
  );
}
