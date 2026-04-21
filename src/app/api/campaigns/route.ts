import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { z } from "zod";

const createCampaignSchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  dailyVisitTarget: z.number().int().positive().default(10),
  status: z.enum(["active", "paused", "completed"]).default("paused"),
  minVisitDuration: z.number().int().positive().default(30),
  maxVisitDuration: z.number().int().positive().default(120),
  minPagesPerVisit: z.number().int().positive().default(1),
  maxPagesPerVisit: z.number().int().positive().default(4),
  warmupSearches: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain");

  const allCampaigns = await db.query.campaigns.findMany({
    where: domain ? eq(schema.campaigns.domain, domain) : undefined,
    with: { keywords: true },
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });
  return NextResponse.json(allCampaigns);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createCampaignSchema.parse(body);
    const id = uuid();

    await db.insert(schema.campaigns).values({ id, ...data });

    const campaign = await db.query.campaigns.findFirst({
      where: eq(schema.campaigns.id, id),
      with: { keywords: true },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Error creating campaign" },
      { status: 500 }
    );
  }
}
