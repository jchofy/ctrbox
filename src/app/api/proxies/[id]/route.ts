import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateProxySchema = z.object({
  name: z.string().min(1).optional(),
  host: z.string().min(1).optional(),
  port: z.number().int().positive().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  protocol: z.enum(["http", "https", "socks5"]).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const proxy = await db.query.proxies.findFirst({
    where: eq(schema.proxies.id, id),
  });

  if (!proxy) {
    return NextResponse.json({ error: "Proxy not found" }, { status: 404 });
  }

  return NextResponse.json(proxy);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateProxySchema.parse(body);

    await db
      .update(schema.proxies)
      .set(data)
      .where(eq(schema.proxies.id, id));

    const proxy = await db.query.proxies.findFirst({
      where: eq(schema.proxies.id, id),
    });

    return NextResponse.json(proxy);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Error updating proxy" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db.delete(schema.proxies).where(eq(schema.proxies.id, id));
  return NextResponse.json({ ok: true });
}
