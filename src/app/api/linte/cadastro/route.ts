import { NextRequest, NextResponse } from "next/server";

const LINTE_API_URL = "https://api.linte.com/graphql";

const MUTATION = `
  mutation CadastroInstrutor($input: Requisition_createFullRequisition_Input!) {
    Requisition_createFullRequisition(input: $input) {
      id
    }
  }
`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.LINTE_API_KEY;
  const orgId = process.env.LINTE_ORGANIZATION_ID;
  const assigneeEmail = process.env.LINTE_ASSIGNEE_EMAIL;

  if (!apiKey || !orgId) {
    return NextResponse.json({ error: "Configuração da integração Linte ausente" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const raw = formData.get("data");
    if (!raw) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const data = JSON.parse(raw as string);

    const fields = [
      { label: "Nome Completo", type: "text", value: data.nomeCompleto },
      { label: "Endereço (Rua/Av, Número, Complemento e CEP)", type: "text", value: data.endereco },
      { label: "Cidade", type: "text", value: data.cidade },
      { label: "Estado", type: "choice", value: data.estado },
      { label: "Data de Nascimento", type: "date", value: data.dataNascimento },
      { label: "É Estrangeiro(a)?", type: "choice", value: data.estrangeiro },
      { label: "Número do PIS", type: "text", value: data.pis },
      { label: "E-mail do Instrutor", type: "email", value: data.email },
      { label: "Telefone (DD + Telefone)", type: "phone_number", value: data.telefone },
      { label: "Banco", type: "text", value: data.banco },
      { label: "Agência", type: "text", value: data.agencia },
      { label: "Conta Corrente", type: "text", value: data.contaCorrente },
      { label: "A conta corrente é Pessoa Física ou vinculada a uma conta PJ?", type: "choice", value: data.tipoConta },
      { label: "O Instrutor possui firma aberta?", type: "choice", value: data.firmaAberta },
      // Campos PJ (preenchidos apenas quando firma aberta = Sim)
      { label: "CNPJ", type: "text", value: data.cnpj },
      { label: "Razão Social", type: "text", value: data.razaoSocial },
      { label: "Nome Fantasia", type: "text", value: data.nomeFantasia },
      { label: "Endereço - CNPJ", type: "text", value: data.enderecoPJ },
      { label: "Cidade | CNPJ", type: "text", value: data.cidadePJ },
      { label: "Estado - CNPJ", type: "choice", value: data.estadoPJ },
      { label: "CEP | CNPJ", type: "text", value: data.cepPJ },
    ].filter((f) => f.value);

    const input: Record<string, unknown> = {
      organizationId: orgId,
      email: data.email,
      requesterRoleId: "ORGANIZATION_GUEST",
      fields,
    };

    if (assigneeEmail) {
      input.assigneeEmail = assigneeEmail;
    }

    const response = await fetch(LINTE_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query: MUTATION, variables: { input } }),
    });

    const json = await response.json();

    if (json.errors) {
      console.error("[Linte] GraphQL errors:", json.errors);
      return NextResponse.json({ error: "Erro ao registrar na plataforma Linte" }, { status: 502 });
    }

    const id = json.data?.Requisition_createFullRequisition?.id;
    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("[Linte] Unexpected error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
