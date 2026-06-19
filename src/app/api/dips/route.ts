import { NextRequest, NextResponse } from "next/server";
import { desc, eq, inArray } from "drizzle-orm";
import { ensureMigrated, getDb } from "@/lib/db";
import { dips, dipParticipants, persons } from "@/lib/db/schema";

export async function GET() {
  await ensureMigrated();
  const db = getDb();

  const allDips = await db.select().from(dips).orderBy(desc(dips.dippedAt));

  const dipIds = allDips.map((d) => d.id);
  if (dipIds.length === 0) {
    return NextResponse.json([]);
  }

  const participants = await db
    .select({
      dipId: dipParticipants.dipId,
      personId: persons.id,
      personName: persons.name,
    })
    .from(dipParticipants)
    .innerJoin(persons, eq(dipParticipants.personId, persons.id))
    .where(inArray(dipParticipants.dipId, dipIds));

  const participantsByDip = participants.reduce<
    Record<number, Array<{ id: number; name: string }>>
  >((acc, p) => {
    if (!acc[p.dipId]) acc[p.dipId] = [];
    acc[p.dipId].push({ id: p.personId, name: p.personName });
    return acc;
  }, {});

  const result = allDips.map((dip) => ({
    ...dip,
    participants: participantsByDip[dip.id] ?? [],
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  await ensureMigrated();
  const db = getDb();
  const body = await request.json();

  const {
    locationName,
    latitude,
    longitude,
    waterTemp,
    airTemp,
    weatherDescription,
    weatherIcon,
    dippedAt,
    notes,
    participantIds,
  } = body;

  if (!locationName || latitude === undefined || longitude === undefined) {
    return NextResponse.json({ error: "Plats krävs" }, { status: 400 });
  }

  if (!participantIds?.length) {
    return NextResponse.json({ error: "Välj minst en badare" }, { status: 400 });
  }

  const [dip] = await db
    .insert(dips)
    .values({
      locationName,
      latitude,
      longitude,
      waterTemp: waterTemp ?? null,
      airTemp: airTemp ?? null,
      weatherDescription: weatherDescription ?? null,
      weatherIcon: weatherIcon ?? null,
      dippedAt: dippedAt ?? new Date().toISOString(),
      notes: notes ?? null,
      createdAt: new Date().toISOString(),
    })
    .returning();

  await db.insert(dipParticipants).values(
    participantIds.map((personId: number) => ({
      dipId: dip.id,
      personId,
    }))
  );

  return NextResponse.json(dip, { status: 201 });
}
