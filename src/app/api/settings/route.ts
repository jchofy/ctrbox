import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_SETTINGS } from "@/lib/constants";

export async function GET() {
  const allSettings = await db.query.settings.findMany();
  const settingsMap: Record<string, { value: string; description: string | null }> = {};

  // Start with defaults
  for (const [key, { value, description }] of Object.entries(DEFAULT_SETTINGS)) {
    settingsMap[key] = { value, description };
  }

  // Override with DB values
  for (const s of allSettings) {
    settingsMap[s.key] = { value: s.value, description: s.description };
  }

  return NextResponse.json(settingsMap);
}

export async function PUT(request: NextRequest) {
  try {
    const body: Record<string, string> = await request.json();

    for (const [key, value] of Object.entries(body)) {
      const existing = await db.query.settings.findFirst({
        where: eq(schema.settings.key, key),
      });

      if (existing) {
        await db
          .update(schema.settings)
          .set({ value: String(value) })
          .where(eq(schema.settings.key, key));
      } else {
        await db.insert(schema.settings).values({
          key,
          value: String(value),
          description: DEFAULT_SETTINGS[key]?.description || null,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Error updating settings" },
      { status: 500 }
    );
  }
}
