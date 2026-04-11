import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) return null;

        // Conta existente sem senha (migração pré-senha-obrigatória)
        if (!user.password) {
          throw new Error("NeedPassword");
        }

        const passwordMatch = await bcrypt.compare(credentials.password as string, user.password);
        if (!passwordMatch) return null;

        const appRole = await prisma.appRole.findUnique({
          where: { userId_app: { userId: user.id, app: "hub-efops" } },
        });

        if (!appRole) {
          throw new Error("NoAccess");
        }

        return { id: user.id, email: user.email, name: user.name, role: appRole.role };
      },
    }),
  ],
});
