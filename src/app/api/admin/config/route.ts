import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_KEYS = ["ALURA_SESSION_COOKIE", "ALURA_CAELUM_TOKEN", "ALURA_USER_ID", "CAELUM_BI_URL"] as const;
type ConfigKey = (typeof ALLOWED_KEYS)[number];

// GET — retorna os valores mascarados (apenas para saber se estão configurados)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const configs = await prisma.systemConfig.findMany({
    where: { key: { in: [...ALLOWED_KEYS] } },
  });

  const result: Record<string, { configured: boolean; updatedAt: string | null; updatedBy: string | null }> = {};

  for (const key of ALLOWED_KEYS) {
    const found = configs.find((c) => c.key === key);
    result[key] = {
      configured: !!found?.value,
      updatedAt: found?.updatedAt?.toISOString() ?? null,
      updatedBy: found?.updatedBy ?? null,
    };
  }

  return NextResponse.json(result);
}

// POST — salva/atualiza um valor criptografado
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const body = await req.json();
  const { key, value } = body as { key: string; value: string };

  if (!ALLOWED_KEYS.includes(key as ConfigKey)) {
    return NextResponse.json({ error: "Chave inválida" }, { status: 400 });
  }

  if (!value || typeof value !== "string") {
    return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
  }

  const encrypted = encrypt(value.trim());

  await prisma.systemConfig.upsert({
    where: { key },
    create: { key, value: encrypted, updatedBy: session.user.email ?? null },
    update: { value: encrypted, updatedBy: session.user.email ?? null },
  });

  return NextResponse.json({ ok: true });
}

// Função auxiliar exportada para uso interno (sync route)
export async function getConfigValue(key: ConfigKey): Promise<string> {
  const config = await prisma.systemConfig.findUnique({ where: { key } });
  if (config?.value) return decrypt(config.value);
  // Fallback para variável de ambiente
  return process.env[key] ?? "";
}
