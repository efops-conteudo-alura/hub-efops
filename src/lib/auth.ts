import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

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
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: string }).role;
      }
      // Imagem nunca vai pro token (evita cookie > 4KB com base64)
      if (trigger === "update" && session) {
        if (session.name !== undefined) token.name = session.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
