import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscriptions = await prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      planName: true,
      description: true,
      url: true,
      loginUser: true,
      loginType: true,
      cost: true,
      currency: true,
      billingCycle: true,
      costCenter: true,
      team: true,
      responsible: true,
      isActive: true,
      renewalDate: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(subscriptions);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  const subscription = await prisma.subscription.create({
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

  await prisma.subscriptionAudit.create({
    data: {
      subscriptionId: subscription.id,
      subscriptionName: subscription.name,
      userId: session.user.id,
      userName: session.user.name ?? session.user.email ?? "Desconhecido",
      action: "CREATE",
    },
  });

  return NextResponse.json(subscription, { status: 201 });
}
