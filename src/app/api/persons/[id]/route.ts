import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { ensureMigrated, getDb } from "@/lib/db";
import { persons } from "@/lib/db/schema";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureMigrated();
  const db = getDb();
  const { id } = await params;
  const personId = parseInt(id, 10);

  if (isNaN(personId)) {
    return NextResponse.json({ error: "Ogiltigt ID" }, { status: 400 });
  }

  await db.delete(persons).where(eq(persons.id, personId));
  return NextResponse.json({ success: true });
}
