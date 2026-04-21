import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const domain = db
    .select()
    .from(schema.domains)
    .where(eq(schema.domains.id, id))
    .get();

  if (!domain) {
    return NextResponse.json({ error: "Dominio no encontrado" }, { status: 404 });
  }

  const campaignCount = db
    .select()
    .from(schema.campaigns)
    .where(eq(schema.campaigns.domain, domain.domain))
    .all().length;

  if (campaignCount > 0) {
    return NextResponse.json(
      { error: `No se puede eliminar: tiene ${campaignCount} campaña(s) asociada(s)` },
      { status: 409 }
    );
  }

  db.delete(schema.domains).where(eq(schema.domains.id, id)).run();

  return NextResponse.json({ ok: true });
}
