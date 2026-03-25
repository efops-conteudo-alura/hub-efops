import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const subscription = await prisma.subscription.findUnique({ where: { id } });
  if (!subscription) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { loginPass: _, ...safeSubscription } = subscription;
  return NextResponse.json(safeSubscription);
}

const AUDITED_FIELDS = [
  "name", "planName", "cost", "currency", "billingCycle",
  "costCenter", "team", "responsible", "isActive", "renewalDate",
  "url", "loginUser", "notes",
] as const;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const before = await prisma.subscription.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of AUDITED_FIELDS) {
    const fromVal = String(before[key] ?? "");
    const toVal = String(subscription[key] ?? "");
    if (fromVal !== toVal) changes[key] = { from: before[key], to: subscription[key] };
  }
  if (Object.keys(changes).length > 0) {
    await prisma.subscriptionAudit.create({
      data: {
        subscriptionId: id,
        subscriptionName: subscription.name,
        userId: session.user.id,
        userName: session.user.name ?? session.user.email ?? "Desconhecido",
        action: "UPDATE",
        changes: changes as unknown as import("@prisma/client").Prisma.InputJsonValue,
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { loginPass: __, ...safeUpdated } = subscription;
  return NextResponse.json(safeUpdated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const subscription = await prisma.subscription.findUnique({ where: { id } });
  if (!subscription) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.subscriptionAudit.create({
    data: {
      subscriptionId: id,
      subscriptionName: subscription.name,
      userId: session.user.id,
      userName: session.user.name ?? session.user.email ?? "Desconhecido",
      action: "DELETE",
    },
  });

  await prisma.subscription.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
