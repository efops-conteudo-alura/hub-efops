/**
 * Script de migração: copiou User.role → AppRole para app="hub-efops".
 * Já foi executado em 2026-03-20. Mantido apenas como histórico.
 *
 * Para reexecutar (idempotente):
 *   node -e "require('dotenv').config({path:'.env.local'}); const {execSync}=require('child_process'); execSync('npx tsx scripts/migrate-roles-to-approle.ts',{stdio:'inherit',env:process.env})"
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  // AppRole já existe — verifica quem ainda não tem e cria com role USER por padrão
  const users = await prisma.user.findMany({
    select: { id: true, email: true },
  });

  console.log(`Verificando AppRole para ${users.length} usuários...`);

  for (const user of users) {
    await prisma.appRole.upsert({
      where: { userId_app: { userId: user.id, app: "hub-efops" } },
      create: { userId: user.id, app: "hub-efops", role: "USER" },
      update: {},
    });
    console.log(`  ✓ ${user.email}`);
  }

  console.log(`\nConcluído.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
