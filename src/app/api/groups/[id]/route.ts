import { NextRequest, NextResponse } from "next/server";
import {
  deleteSharedGroup,
  enableGroupSharing,
  getGroupSync,
  updateGroupName,
  uploadGroupSnapshot,
} from "@/lib/db/server-groups";

function getUserId(request: NextRequest): string | null {
  return request.headers.get("X-User-Id");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const since = request.nextUrl.searchParams.get("since") ?? undefined;

  const sync = await getGroupSync(id, userId, since ?? undefined);
  if (!sync) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(sync);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  try {
    if (body.action === "share") {
      const shareCode = await enableGroupSharing(id, userId);
      return NextResponse.json({ shareCode });
    }

    if (body.action === "upload") {
      const group = await uploadGroupSnapshot(id, userId, body.payload);
      return NextResponse.json(group);
    }

    if (body.name) {
      await updateGroupName(id, userId, body.name);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserId(_request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteSharedGroup(id, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }
}
