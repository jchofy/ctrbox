import { db, schema } from "@/db";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { z } from "zod";

const createKeywordSchema = z.object({
  keyword: z.string().min(1),
  targetUrl: z.string().url(),
  dailyVisitTarget: z.number().int().positive().default(5),
  isActive: z.boolean().default(true),
});

const updateKeywordSchema = z.object({
  id: z.string(),
  keyword: z.string().min(1).optional(),
  targetUrl: z.string().url().optional(),
  dailyVisitTarget: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const allKeywords = await db.query.keywords.findMany({
    where: eq(schema.keywords.campaignId, id),
  });
  return NextResponse.json(allKeywords);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const body = await request.json();

    // Support both single and batch creation
    const items = Array.isArray(body) ? body : [body];
    const created = [];

    for (const item of items) {
      const data = createKeywordSchema.parse(item);
      const id = uuid();
      await db
        .insert(schema.keywords)
        .values({ id, campaignId, ...data });
      created.push({ id, campaignId, ...data });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Error creating keyword" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const body = await request.json();
    const data = updateKeywordSchema.parse(body);

    await db
      .update(schema.keywords)
      .set(data)
      .where(
        and(
          eq(schema.keywords.id, data.id),
          eq(schema.keywords.campaignId, campaignId)
        )
      );

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Error updating keyword" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keywordId = searchParams.get("keywordId");

  if (!keywordId) {
    return NextResponse.json(
      { error: "keywordId required" },
      { status: 400 }
    );
  }

  await db
    .delete(schema.keywords)
    .where(eq(schema.keywords.id, keywordId));

  return NextResponse.json({ ok: true });
}
