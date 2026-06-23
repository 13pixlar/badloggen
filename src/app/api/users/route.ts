import { NextRequest, NextResponse } from "next/server";
import { upsertUser } from "@/lib/db/server-groups";

export async function POST(request: NextRequest) {
  const userId = request.headers.get("X-User-Id");
  if (!userId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 401 });
  }

  const body = await request.json();
  const displayName = body.displayName?.trim();
  if (!displayName) {
    return NextResponse.json({ error: "Display name required" }, { status: 400 });
  }

  await upsertUser(userId, displayName);
  return NextResponse.json({ id: userId, displayName });
}
