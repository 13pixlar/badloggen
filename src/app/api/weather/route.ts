import { NextRequest, NextResponse } from "next/server";
import { fetchWeather, fetchWaterTemperature } from "@/lib/services/weather";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "Ogiltiga koordinater" }, { status: 400 });
  }

  const [weather, waterTemp] = await Promise.all([
    fetchWeather(lat, lon),
    fetchWaterTemperature(lat, lon),
  ]);

  return NextResponse.json({ weather, waterTemp });
}
