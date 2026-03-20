/**
 * Script para criar o primeiro usuário administrador.
 *
 * Como usar:
 *   npx tsx scripts/create-admin.ts
 *
 * Certifique-se de ter rodado as migrations antes:
 *   npx prisma migrate dev
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@empresa.com";
  const password = "admin123";
  const name = "Administrador";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Usuário ${email} já existe.`);
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed },
  });

  await prisma.appRole.create({
    data: { userId: user.id, app: "hub-efops", role: "ADMIN" },
  });

  console.log(`\nUsuário admin criado com sucesso!`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Senha: ${password}`);
  console.log(`\nALTERE A SENHA após o primeiro login!\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
