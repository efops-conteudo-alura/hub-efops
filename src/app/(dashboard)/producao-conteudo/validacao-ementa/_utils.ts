export function extrairResumo(avaliacao: string): { resumo: string; avaliacaoSemResumo: string } {
  const marcador = "## Resumo para o instrutor";
  const idx = avaliacao.indexOf(marcador);
  if (idx === -1) return { resumo: "", avaliacaoSemResumo: avaliacao };
  return {
    resumo: avaliacao.slice(idx + marcador.length).trim(),
    avaliacaoSemResumo: avaliacao.slice(0, idx).trim(),
  };
}
