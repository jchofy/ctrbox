import { db, schema } from "@/db";
import { sql, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";

export async function GET() {
  const results = db
    .select({
      id: schema.domains.id,
      domain: schema.domains.domain,
      createdAt: schema.domains.createdAt,
      count: sql<number>`(SELECT count(*) FROM campaigns WHERE campaigns.domain = ${schema.domains.domain})`.as("count"),
    })
    .from(schema.domains)
    .orderBy(schema.domains.domain)
    .all();

  return NextResponse.json(results);
}

const createSchema = z.object({
  domain: z
    .string()
    .min(1, "Dominio requerido")
    .transform((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "")),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { domain } = parsed.data;

  const existing = db
    .select()
    .from(schema.domains)
    .where(eq(schema.domains.domain, domain))
    .get();

  if (existing) {
    return NextResponse.json({ error: "El dominio ya existe" }, { status: 409 });
  }

  const id = randomUUID();
  db.insert(schema.domains)
    .values({ id, domain, createdAt: new Date().toISOString() })
    .run();

  return NextResponse.json({ id, domain }, { status: 201 });
}
