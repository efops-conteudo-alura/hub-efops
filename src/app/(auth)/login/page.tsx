"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contaCriada = searchParams.get("msg") === "conta-criada";
  const senhaCriada = searchParams.get("msg") === "senha-criada";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.error === "NeedPassword") {
        setError("Sua conta ainda não tem senha. Crie uma em /criar-senha.");
      } else if (result.error === "NoAccess") {
        setError("Você não tem acesso a este sistema. Contacte um administrador.");
      } else {
        setError("Email ou senha inválidos.");
      }
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-light">Hub de Eficiência Operacional</CardTitle>
          <CardDescription>
            Entre com suas credenciais para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>
            {(contaCriada || senhaCriada) && !error && (
              <p className="text-sm text-green-600 bg-green-600/10 px-3 py-2 rounded-lg">
                {senhaCriada ? "Senha criada! Faça login para continuar." : "Conta criada com sucesso! Faça login para continuar."}
              </p>
            )}
            {error && (
              <p className="text-sm text-destructive">
                {error}{" "}
                {error.includes("/criar-senha") && (
                  <Link href="/criar-senha" className="underline font-medium">
                    Criar senha
                  </Link>
                )}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Primeiro acesso?{" "}
              <Link href="/primeiro-acesso" className="underline">
                Criar conta
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
