import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  domain: z.string().min(1).optional(),
  dailyVisitTarget: z.number().int().positive().optional(),
  status: z.enum(["active", "paused", "completed"]).optional(),
  minVisitDuration: z.number().int().positive().optional(),
  maxVisitDuration: z.number().int().positive().optional(),
  minPagesPerVisit: z.number().int().positive().optional(),
  maxPagesPerVisit: z.number().int().positive().optional(),
  warmupSearches: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const campaign = await db.query.campaigns.findFirst({
    where: eq(schema.campaigns.id, id),
    with: { keywords: true, visits: true },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json(campaign);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = updateCampaignSchema.parse(body);

    await db
      .update(schema.campaigns)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(schema.campaigns.id, id));

    const campaign = await db.query.campaigns.findFirst({
      where: eq(schema.campaigns.id, id),
      with: { keywords: true },
    });

    return NextResponse.json(campaign);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Error updating campaign" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await db
    .delete(schema.campaigns)
    .where(eq(schema.campaigns.id, id));

  return NextResponse.json({ ok: true });
}
