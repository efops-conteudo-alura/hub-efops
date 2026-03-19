"use client";

import { useState } from "react";
import { PesquisaForm } from "./pesquisa-form";
import { HistoricoPesquisas } from "./historico-pesquisas";

interface PesquisaResumo {
  id: string;
  assunto: string;
  tipoConteudo: string;
  tipoPesquisa: string;
  autorNome: string;
  createdAt: string;
}

interface Props {
  pesquisasIniciais: PesquisaResumo[];
}

export function PesquisaMercadoWrapper({ pesquisasIniciais }: Props) {
  const [pesquisas, setPesquisas] = useState<PesquisaResumo[]>(pesquisasIniciais);

  function adicionarPesquisa(p: PesquisaResumo) {
    setPesquisas((prev) => [p, ...prev]);
  }

  return (
    <>
      <PesquisaForm onNovaPesquisa={adicionarPesquisa} />
      <HistoricoPesquisas pesquisas={pesquisas} />
    </>
  );
}
