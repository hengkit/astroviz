import { NextRequest, NextResponse } from "next/server";

const HEADERS = { "User-Agent": "apviz/1.0 (astronomy visualization)" };

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing lat or lng" }, { status: 400 });
  }

  const pointsRes = await fetch(
    `https://api.weather.gov/points/${lat},${lng}`,
    { headers: HEADERS }
  );

  if (!pointsRes.ok) {
    return NextResponse.json({ error: "Weather API unavailable" }, { status: 502 });
  }

  const points = await pointsRes.json();
  const { astronomicalData, forecast: forecastUrl } = points.properties;

  const forecastRes = await fetch(forecastUrl, { headers: HEADERS });
  if (!forecastRes.ok) {
    return NextResponse.json({ astronomicalData, tonight: null });
  }

  const forecast = await forecastRes.json();
  const tonight = forecast.properties.periods.find(
    (p: { name: string }) => p.name === "Tonight"
  ) ?? null;

  return NextResponse.json({ astronomicalData, tonight });
}
