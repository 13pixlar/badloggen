import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { ensureMigrated, getDb } from "@/lib/db";
import { dipParticipants, persons } from "@/lib/db/schema";

export async function GET() {
  await ensureMigrated();
  const db = getDb();

  const leaderboard = await db
    .select({
      id: persons.id,
      name: persons.name,
      dipCount: sql<number>`count(${dipParticipants.dipId})`.as("dip_count"),
    })
    .from(persons)
    .leftJoin(dipParticipants, sql`${persons.id} = ${dipParticipants.personId}`)
    .groupBy(persons.id)
    .orderBy(sql`dip_count desc`);

  return NextResponse.json(leaderboard);
}
