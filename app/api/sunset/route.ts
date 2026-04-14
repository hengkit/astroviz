import { NextRequest, NextResponse } from "next/server";

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const tz = searchParams.get("tz") ?? "0";

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing lat or lng" }, { status: 400 });
  }

  const dateParam = searchParams.get("date");
  const today = dateParam ?? addDays(new Date(), 0);
  const tomorrow = addDays(new Date(today + "T12:00:00Z"), 1);

  const base = `https://aa.usno.navy.mil/api/rstt/oneday?coords=${lat},${lng}&tz=${tz}`;

  const [todayRes, tomorrowRes] = await Promise.all([
    fetch(`${base}&date=${today}`),
    fetch(`${base}&date=${tomorrow}`),
  ]);

  if (!todayRes.ok || !tomorrowRes.ok) {
    return NextResponse.json({ error: "USNO API error" }, { status: 502 });
  }

  const [todayData, tomorrowData] = await Promise.all([
    todayRes.json(),
    tomorrowRes.json(),
  ]);

  return NextResponse.json({ today: todayData, tomorrow: tomorrowData });
}
