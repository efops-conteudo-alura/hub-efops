import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const subscription = await prisma.subscription.findUnique({ where: { id } });
  if (!subscription) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...subscription,
    loginPass: subscription.loginPass ? decrypt(subscription.loginPass) : null,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  const subscription = await prisma.subscription.update({
    where: { id },
    data: {
      name: body.name,
      planName: body.planName || null,
      description: body.description || null,
      url: body.url || null,
      loginUser: body.loginUser || null,
      loginPass: body.loginPass ? encrypt(body.loginPass) : null,
      loginType: body.loginType || "PASSWORD",
      cost: body.cost ? parseFloat(body.cost) : null,
      currency: body.currency || "BRL",
      billingCycle: body.billingCycle || "MONTHLY",
      costCenter: body.costCenter || null,
      team: body.team || null,
      responsible: body.responsible || null,
      isActive: body.isActive ?? true,
      renewalDate: body.renewalDate ? new Date(body.renewalDate) : null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(subscription);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.subscription.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
