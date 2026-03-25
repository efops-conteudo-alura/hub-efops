/**
 * Adiciona AppRole hub-producao-conteudo/USER para todos os usuários
 * que têm AppRole no hub-efops mas ainda não têm no hub-producao-conteudo.
 *
 * Executar uma única vez após o registro do novo app no sistema.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  const hubUsers = await prisma.appRole.findMany({
    where: { app: "hub-efops" },
    include: { user: { select: { email: true } } },
  });

  console.log(`${hubUsers.length} usuários no hub-efops.`);

  let adicionados = 0;
  let jaExistiam = 0;

  for (const hubRole of hubUsers) {
    const result = await prisma.appRole.upsert({
      where: { userId_app: { userId: hubRole.userId, app: "hub-producao-conteudo" } },
      create: { userId: hubRole.userId, app: "hub-producao-conteudo", role: "USER" },
      update: {},
    });

    const isNew = Date.now() - result.createdAt.getTime() < 5000;
    if (isNew) {
      adicionados++;
      console.log(`  ✓ ${hubRole.user.email} → hub-producao-conteudo: USER`);
    } else {
      jaExistiam++;
      console.log(`  — ${hubRole.user.email} já tinha acesso`);
    }
  }

  console.log(`\nConcluído: ${adicionados} adicionados, ${jaExistiam} já existiam.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
