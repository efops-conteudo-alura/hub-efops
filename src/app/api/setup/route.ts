import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { prisma } = await import("@/lib/db");
    const bcrypt = (await import("bcryptjs")).default;

    const count = await prisma.user.count();
    if (count > 0) {
      return NextResponse.json(
        { error: "Setup já foi realizado." },
        { status: 403 }
      );
    }

    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Preencha todos os campos." },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: "ADMIN" },
    });

    return NextResponse.json({ success: true, email: user.email });
  } catch (error) {
    console.error("[SETUP ERROR]", error);
    const message =
      error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
    return NextResponse.json(
      { error: `Erro interno: ${message}` },
      { status: 500 }
    );
  }
}
