import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/((?!api/auth|api/setup|api/relatorios/form|login|setup|relatorios/responder|primeiro-acesso|_next/static|_next/image|favicon.ico).*)",
  ],
};
