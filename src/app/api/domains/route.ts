import { db, schema } from "@/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const results = db
    .select({
      domain: schema.campaigns.domain,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(schema.campaigns)
    .groupBy(schema.campaigns.domain)
    .orderBy(schema.campaigns.domain)
    .all();

  return NextResponse.json(results);
}
