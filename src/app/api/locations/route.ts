import { NextRequest, NextResponse } from "next/server";
import { searchBathingSpots } from "@/lib/services/weather";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  const suggestions = await searchBathingSpots(
    query,
    lat ? parseFloat(lat) : undefined,
    lon ? parseFloat(lon) : undefined
  );

  return NextResponse.json(suggestions);
}
