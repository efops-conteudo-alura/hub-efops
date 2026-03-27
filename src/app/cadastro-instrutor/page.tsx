"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gauge, CheckCircle, Upload } from "lucide-react";

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
  "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
  "RS","RO","RR","SC","SP","SE","TO",
];

const schema = z.object({
  nomeCompleto: z.string().min(1, "Obrigatório"),
  endereco: z.string().min(1, "Obrigatório"),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  dataNascimento: z.string().optional(),
  estrangeiro: z.string().min(1, "Obrigatório"),
  pis: z.string().optional(),
  email: z.string().email("Email inválido"),
  telefone: z.string().optional(),
  banco: z.string().optional(),
  agencia: z.string().optional(),
  contaCorrente: z.string().optional(),
  tipoConta: z.string().min(1, "Obrigatório"),
  firmaAberta: z.string().min(1, "Obrigatório"),
  // Campos PJ (condicionais)
  cnpj: z.string().optional(),
  razaoSocial: z.string().optional(),
  nomeFantasia: z.string().optional(),
  enderecoPJ: z.string().optional(),
  cidadePJ: z.string().optional(),
  estadoPJ: z.string().optional(),
  cepPJ: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CadastroInstrutorPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const tipoConta = watch("tipoConta");
  const firmaAberta = watch("firmaAberta");

  async function onSubmit(data: FormData) {
    setLoading(true);
    setSubmitError("");
    try {
      const formData = new FormData();
      formData.append("data", JSON.stringify(data));
      if (comprovanteFile) formData.append("comprovante", comprovanteFile);

      const res = await fetch("/api/linte/cadastro", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "Erro ao enviar");
      setSubmitted(true);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Erro ao enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-10 space-y-4">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Cadastro enviado!</h2>
            <p className="text-muted-foreground">
              Suas informações foram recebidas com sucesso.
              Em breve entraremos em contato.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Gauge size={22} className="text-muted-foreground" />
          <span className="font-bold text-lg">EFops Hub — Alura</span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cadastro de Instrutor Parceiro</CardTitle>
            <CardDescription>
              Preencha os dados abaixo para que possamos elaborar o seu contrato.
              Campos marcados com * são obrigatórios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* Nome completo */}
              <div className="space-y-1.5">
                <Label htmlFor="nomeCompleto">Nome completo *</Label>
                <Input id="nomeCompleto" {...register("nomeCompleto")} placeholder="Seu nome completo" />
                {errors.nomeCompleto && <p className="text-xs text-destructive">{errors.nomeCompleto.message}</p>}
              </div>

              {/* Endereço */}
              <div className="space-y-1.5">
                <Label htmlFor="endereco">Endereço (Rua/Av, Número, Complemento e CEP) *</Label>
                <Input id="endereco" {...register("endereco")} placeholder="Rua Exemplo, 123, Apto 1, 01001-000" />
                {errors.endereco && <p className="text-xs text-destructive">{errors.endereco.message}</p>}
              </div>

              {/* Cidade + Estado */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input id="cidade" {...register("cidade")} placeholder="São Paulo" />
                </div>
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <Controller
                    name="estado"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>
                          {ESTADOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              {/* Data nascimento + Estrangeiro */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="dataNascimento">Data de nascimento</Label>
                  <Input id="dataNascimento" type="date" {...register("dataNascimento")} />
                </div>
                <div className="space-y-1.5">
                  <Label>É estrangeiro(a)? *</Label>
                  <Controller
                    name="estrangeiro"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Não">Não</SelectItem>
                          <SelectItem value="Sim">Sim</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.estrangeiro && <p className="text-xs text-destructive">{errors.estrangeiro.message}</p>}
                </div>
              </div>

              {/* PIS + Email */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pis">Número do PIS</Label>
                  <Input id="pis" {...register("pis")} placeholder="000.00000.00-0" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input id="email" type="email" {...register("email")} placeholder="seu@email.com" />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
              </div>

              {/* Telefone */}
              <div className="space-y-1.5">
                <Label htmlFor="telefone">Telefone (DD + número)</Label>
                <Input id="telefone" {...register("telefone")} placeholder="(11) 99999-9999" />
              </div>

              {/* Dados bancários */}
              <div className="border rounded-lg p-4 space-y-4">
                <p className="text-sm font-medium">Dados bancários</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="banco">Banco</Label>
                    <Input id="banco" {...register("banco")} placeholder="Ex: Itaú" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="agencia">Agência</Label>
                    <Input id="agencia" {...register("agencia")} placeholder="0000" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contaCorrente">Conta corrente</Label>
                    <Input id="contaCorrente" {...register("contaCorrente")} placeholder="00000-0" />
                  </div>
                </div>

                {/* Tipo de conta */}
                <div className="space-y-1.5">
                  <Label>A conta corrente é Pessoa Física ou vinculada a uma conta PJ? *</Label>
                  <Controller
                    name="tipoConta"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pessoa Física">Pessoa Física</SelectItem>
                          <SelectItem value="Pessoa Jurídica (PJ)">Pessoa Jurídica (PJ)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.tipoConta && <p className="text-xs text-destructive">{errors.tipoConta.message}</p>}
                </div>

                {/* Comprovante bancário — aparece após selecionar tipo de conta */}
                {tipoConta && (
                  <div className="space-y-1.5">
                    <Label>Anexe comprovante dos dados bancários</Label>
                    <label className="flex items-center gap-2 cursor-pointer w-fit border rounded-md px-4 py-2 text-sm hover:bg-muted transition-colors">
                      <Upload size={16} />
                      {comprovanteFile ? comprovanteFile.name : "Enviar arquivo"}
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setComprovanteFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Firma aberta */}
              <div className="space-y-1.5">
                <Label>O instrutor possui firma aberta? *</Label>
                <Controller
                  name="firmaAberta"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Não">Não</SelectItem>
                        <SelectItem value="Sim">Sim</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.firmaAberta && <p className="text-xs text-destructive">{errors.firmaAberta.message}</p>}
              </div>

              {/* Campos PJ — aparecem quando firma aberta = Sim */}
              {firmaAberta === "Sim" && (
                <div className="border rounded-lg p-4 space-y-4">
                  <p className="text-sm font-medium">Dados da Pessoa Jurídica</p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input id="cnpj" {...register("cnpj")} placeholder="00.000.000/0001-00" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="razaoSocial">Razão social</Label>
                      <Input id="razaoSocial" {...register("razaoSocial")} placeholder="Empresa Ltda" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="nomeFantasia">Nome fantasia</Label>
                    <Input id="nomeFantasia" {...register("nomeFantasia")} placeholder="Nome fantasia" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="enderecoPJ">Endereço da empresa (Rua/Av, Número, Complemento, Cidade, Estado e CEP)</Label>
                    <Input id="enderecoPJ" {...register("enderecoPJ")} placeholder="Rua Exemplo, 123, São Paulo, SP, 01001-000" />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="cidadePJ">Cidade</Label>
                      <Input id="cidadePJ" {...register("cidadePJ")} placeholder="São Paulo" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Estado</Label>
                      <Controller
                        name="estadoPJ"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                            <SelectContent>
                              {ESTADOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cepPJ">CEP</Label>
                      <Input id="cepPJ" {...register("cepPJ")} placeholder="00000-000" />
                    </div>
                  </div>
                </div>
              )}

              {/* Documentação - aviso */}
              <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Documentação para o contrato</p>
                <p>Envie um único arquivo com seu nome completo, contendo:</p>
                <p><span className="font-medium">Autônomo:</span> RG, CPF, comprovante de residência e comprovante bancário</p>
                <p><span className="font-medium">PJ:</span> Cartão CNPJ, RG do representante legal e comprovante bancário</p>
              </div>

              {submitError && <p className="text-sm text-destructive">{submitError}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Enviando..." : "Enviar cadastro"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
