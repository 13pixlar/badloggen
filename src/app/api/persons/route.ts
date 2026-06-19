import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { ensureMigrated, getDb } from "@/lib/db";
import { persons } from "@/lib/db/schema";

export async function GET() {
  await ensureMigrated();
  const db = getDb();
  const allPersons = await db.select().from(persons).orderBy(persons.name);
  return NextResponse.json(allPersons);
}

export async function POST(request: NextRequest) {
  await ensureMigrated();
  const db = getDb();
  const body = await request.json();
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "Namn krävs" }, { status: 400 });
  }

  const [person] = await db
    .insert(persons)
    .values({ name, createdAt: new Date().toISOString() })
    .returning();

  return NextResponse.json(person, { status: 201 });
}
