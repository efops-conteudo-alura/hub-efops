import { config } from "dotenv";
config({ path: ".env.local" });
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  const email = "jeferson.silva@alura.com.br";

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email, name: "Jeferson Silva" },
    });
    console.log(`✓ Usuário criado: ${email}`);
  } else {
    console.log(`  Usuário já existe: ${email}`);
  }

  await prisma.appRole.upsert({
    where: { userId_app: { userId: user.id, app: "select-activity" } },
    create: { userId: user.id, app: "select-activity", role: "COORDINATOR" },
    update: { role: "COORDINATOR" },
  });

  console.log(`✓ ${email} → select-activity: COORDINATOR`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
