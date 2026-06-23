import { NextRequest, NextResponse } from "next/server";
import {
  createSharedGroup,
  getUserGroups,
  joinGroupByShareCode,
} from "@/lib/db/server-groups";

function getUserId(request: NextRequest): string | null {
  return request.headers.get("X-User-Id");
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groups = await getUserGroups(userId);
  return NextResponse.json(groups);
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (body.action === "join") {
    const shareCode = body.shareCode?.trim();
    if (!shareCode) {
      return NextResponse.json({ error: "Share code required" }, { status: 400 });
    }
    try {
      const group = await joinGroupByShareCode(shareCode, userId);
      return NextResponse.json(group);
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_CODE") {
        return NextResponse.json({ error: "Invalid share code" }, { status: 404 });
      }
      throw error;
    }
  }

  const name = body.name?.trim();
  const groupId = body.id;
  if (!name || !groupId) {
    return NextResponse.json({ error: "Name and id required" }, { status: 400 });
  }

  const group = await createSharedGroup(userId, name, groupId);
  return NextResponse.json(group);
}
