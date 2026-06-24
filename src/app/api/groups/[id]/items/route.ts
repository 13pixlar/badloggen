import { NextRequest, NextResponse } from "next/server";
import {
  addPersonToSharedGroup,
  createSharedDip,
  deleteSharedDip,
  removePersonFromSharedGroup,
  updateSharedDip,
} from "@/lib/db/server-groups";

function getUserId(request: NextRequest): string | null {
  return request.headers.get("X-User-Id");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;
  const body = await request.json();

  try {
    if (body.type === "person") {
      const personId = await addPersonToSharedGroup(groupId, userId, body.person);
      return NextResponse.json({ personId });
    }

    if (body.type === "dip") {
      const dipId = await createSharedDip(groupId, userId, body.dip);
      return NextResponse.json({ dipId });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Failed to create shared group item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;
  const body = await request.json();

  try {
    if (body.type === "dip" && body.dipId) {
      await updateSharedDip(groupId, userId, body.dipId, body.dip);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("Failed to update shared group item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: groupId } = await params;
  const type = request.nextUrl.searchParams.get("type");
  const itemId = Number(request.nextUrl.searchParams.get("id"));

  if (!type || !itemId) {
    return NextResponse.json({ error: "Missing type or id" }, { status: 400 });
  }

  try {
    if (type === "dip") {
      await deleteSharedDip(groupId, userId, itemId);
    } else if (type === "person") {
      await removePersonFromSharedGroup(groupId, userId, itemId);
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }
}
