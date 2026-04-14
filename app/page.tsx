"use client";

import { useState, useMemo } from "react";
import messierData from "@/data/messier.json";
import { parseRA, parseDec, maxAltitudeDuringNight, peakDetails, riseSetDuringNight, compassDirection } from "@/lib/astronomy";

interface Location {
  lat: string;
  lng: string;
}

interface SunEvent {
  phen: string;
  time: string;
}

interface UsnoData {
  sundata: SunEvent[];
  moondata: SunEvent[];
  day_of_week: string;
  day: number;
  month: number;
  year: number;
  curphase: string;
  fracillum: string;
}

interface SunMoonData {
  today: UsnoData;
  tomorrow: UsnoData;
}

const TYPE_LABEL: Record<string, string> = {
  Gc: "Globular Cluster",
  Oc: "Open Cluster",
  Sp: "Spiral Galaxy",
  El: "Elliptical Galaxy",
  Di: "Diffuse Nebula",
  Pl: "Planetary Nebula",
  Sn: "Supernova Remnant",
  Ba: "Barred Spiral",
  Ir: "Irregular Galaxy",
  Ln: "Lenticular Galaxy",
  MW: "Star Cloud",
  Ds: "Double Star",
  As: "Asterism",
};

function Row({ label, time }: { label: string; time: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-white font-medium">{label}</span>
      <span className="font-mono text-sm text-indigo-300 font-semibold">{time}</span>
    </div>
  );
}

function moonNightMessage(
  moondata: SunEvent[],
  sunsetTime: string,
  sunriseTime: string,
  fracillum: string
): string {
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  };

  const sunsetMin = toMin(sunsetTime);
  const sunriseMin = toMin(sunriseTime) + 1440; // next day
  const illum = parseInt(fracillum);

  const riseEv = moondata.find((e) => e.phen === "Rise");
  const setEv = moondata.find((e) => e.phen === "Set");
  const transitEv = moondata.find((e) => e.phen === "Upper Transit");

  if (!riseEv && !setEv) {
    if (transitEv) {
      const t = toMin(transitEv.time);
      return t >= sunsetMin || t <= toMin(sunriseTime)
        ? `Moon up all night — ${fracillum} illuminated`
        : "Moon not visible tonight";
    }
    return "Moon not visible tonight";
  }

  const riseMin = riseEv ? toMin(riseEv.time) : null;
  let setMin = setEv ? toMin(setEv.time) : null;
  if (riseMin !== null && setMin !== null && setMin < riseMin) setMin += 1440;

  const moonStart = riseMin ?? 0;
  const moonEnd = setMin ?? 2880;
  const overlap = Math.min(sunriseMin, moonEnd) - Math.max(sunsetMin, moonStart);

  if (overlap <= 0) {
    return illum < 5 ? "New Moon — ideal viewing conditions" : "Moon not visible tonight";
  }

  const tag = illum < 10 ? "minimal light" : `${fracillum} illuminated`;

  if (riseMin !== null && riseMin >= sunsetMin) {
    return `Moon rises at ${fmt(riseEv!.time)} — ${tag}`;
  } else if (setMin !== null && setMin <= sunriseMin) {
    return `Moon sets at ${fmt(setEv!.time)} — ${tag}`;
  } else {
    return `Moon visible all night — ${tag}`;
  }
}

interface CompassPoint { bearing: number; altitude: number; }

function Compass({ risePoint, peakPoint, setPoint, selected }: {
  risePoint: CompassPoint | null;
  peakPoint: CompassPoint;
  setPoint: CompassPoint | null;
  selected: "rise" | "peak" | "set";
}) {
  const cx = 60, cy = 60, r = 48;

  const toXY = ({ bearing, altitude }: CompassPoint) => {
    const dr = r * (1 - Math.min(90, Math.max(0, altitude)) / 90);
    return {
      x: cx + dr * Math.sin((bearing * Math.PI) / 180),
      y: cy - dr * Math.cos((bearing * Math.PI) / 180),
    };
  };

  const rXY = risePoint ? toXY(risePoint) : null;
  const pXY = toXY(peakPoint);
  const sXY = setPoint ? toXY(setPoint) : null;

  // Quadratic bezier control point so the curve passes through peakXY at t=0.5
  const arcPath = (() => {
    if (rXY && sXY) {
      const cpX = 2 * pXY.x - 0.5 * rXY.x - 0.5 * sXY.x;
      const cpY = 2 * pXY.y - 0.5 * rXY.y - 0.5 * sXY.y;
      return `M ${rXY.x} ${rXY.y} Q ${cpX} ${cpY} ${sXY.x} ${sXY.y}`;
    }
    if (rXY) return `M ${rXY.x} ${rXY.y} L ${pXY.x} ${pXY.y}`;
    if (sXY) return `M ${pXY.x} ${pXY.y} L ${sXY.x} ${sXY.y}`;
    return null;
  })();

  const selectedXY = selected === "rise" ? (rXY ?? pXY) : selected === "set" ? (sXY ?? pXY) : pXY;
  const dots: { xy: { x: number; y: number }; key: string }[] = [
    ...(rXY ? [{ xy: rXY, key: "rise" }] : []),
    { xy: pXY, key: "peak" },
    ...(sXY ? [{ xy: sXY, key: "set" }] : []),
  ];

  return (
    <svg viewBox="0 0 120 120" width="120" height="120" className="shrink-0">
      <circle cx={cx} cy={cy} r={59} fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
      {Array.from({ length: 36 }, (_, i) => i * 10).map((deg) => {
        const major = deg % 90 === 0;
        const ir = major ? r - 7 : r - 3;
        const ix = cx + ir * Math.sin((deg * Math.PI) / 180);
        const iy = cy - ir * Math.cos((deg * Math.PI) / 180);
        const ox = cx + r * Math.sin((deg * Math.PI) / 180);
        const oy = cy - r * Math.cos((deg * Math.PI) / 180);
        return <line key={deg} x1={ix} y1={iy} x2={ox} y2={oy}
          stroke={major ? "#52525b" : "#3f3f46"} strokeWidth={major ? 1.5 : 0.75} />;
      })}
      {(["N", "E", "S", "W"] as const).map((label, i) => {
        const lx = cx + (r - 16) * Math.sin((i * 90 * Math.PI) / 180);
        const ly = cy - (r - 16) * Math.cos((i * 90 * Math.PI) / 180);
        return <text key={label} x={lx} y={ly + 4} textAnchor="middle"
          fill="#71717a" fontSize="11" fontFamily="sans-serif">{label}</text>;
      })}
      {arcPath && <path d={arcPath} fill="none" stroke="#4f46e5" strokeWidth="1.5"
        strokeOpacity="0.5" strokeLinecap="round" />}
      <line x1={cx} y1={cy} x2={selectedXY.x} y2={selectedXY.y}
        stroke="#818cf8" strokeWidth="2" strokeLinecap="round" />
      {dots.map(({ xy, key }) => (
        <circle key={key} cx={xy.x} cy={xy.y} r={key === selected ? 4 : 3}
          fill={key === selected ? "#818cf8" : "#4f46e5"}
          fillOpacity={key === selected ? 1 : 0.6} />
      ))}
      <circle cx={cx} cy={cy} r="3" fill="#818cf8" />
    </svg>
  );
}

function parseLocalTime(timeStr: string, year: number, month: number, day: number): Date {
  const [h, m] = timeStr.split(":").map(Number);
  return new Date(year, month - 1, day, h, m);
}


export default function Home() {
  const [location, setLocation] = useState<Location>({ lat: "37.7", lng: "-122.4" });
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [detecting, setDetecting] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const [data, setData] = useState<SunMoonData | null>(null);
  const [selectedM, setSelectedM] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"altitude" | "magnitude" | "size">("altitude");
  const [minAltitude, setMinAltitude] = useState(10);
  const [selectedEvent, setSelectedEvent] = useState<"rise" | "peak" | "set">("peak");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  function detectLocation() {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setDetecting(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        });
        setDetecting(false);
      },
      () => {
        setGeoError("Unable to retrieve your location.");
        setDetecting(false);
      }
    );
  }

  async function saveLocation() {
    setLoading(true);
    setFetchError(null);
    setData(null);

    const tz = (-new Date().getTimezoneOffset() / 60).toString();

    try {
      const res = await fetch(
        `/api/sunset?lat=${location.lat}&lng=${location.lng}&tz=${tz}&date=${date}`
      );
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData({
        today: json.today.properties.data,
        tomorrow: json.tomorrow.properties.data,
      });
    } catch {
      setFetchError("Could not load sun data. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const isValid =
    location.lat !== "" &&
    location.lng !== "" &&
    !isNaN(Number(location.lat)) &&
    !isNaN(Number(location.lng)) &&
    Math.abs(Number(location.lat)) <= 90 &&
    Math.abs(Number(location.lng)) <= 180;

  const sunset = data?.today.sundata.find((e) => e.phen === "Set");
  const sunrise = data?.tomorrow.sundata.find((e) => e.phen === "Rise");

  const visibleObjects = useMemo(() => {
    if (!data || !sunset || !sunrise) return null;

    const lat = Number(location.lat);
    const lng = Number(location.lng);
    const { today, tomorrow } = data;

    const sunsetDate = parseLocalTime(sunset.time, today.year, today.month, today.day);
    const sunriseDate = parseLocalTime(sunrise.time, tomorrow.year, tomorrow.month, tomorrow.day);

    return messierData
      .map((obj) => ({
        ...obj,
        maxAlt: maxAltitudeDuringNight(
          parseRA(obj.ra),
          parseDec(obj.dec),
          lat,
          lng,
          sunsetDate,
          sunriseDate
        ),
      }))
      .filter((obj) => obj.maxAlt >= minAltitude)
      .sort((a, b) => b.maxAlt - a.maxAlt);
  }, [data, location.lat, location.lng, sunset, sunrise]);

  const selectedObj = selectedM ? visibleObjects?.find((o) => o.m === selectedM) : null;

  const peak = useMemo(() => {
    if (!selectedObj || !data || !sunset || !sunrise) return null;
    const { today, tomorrow } = data;
    const sunsetDate = parseLocalTime(sunset.time, today.year, today.month, today.day);
    const sunriseDate = parseLocalTime(sunrise.time, tomorrow.year, tomorrow.month, tomorrow.day);
    const raH = parseRA(selectedObj.ra);
    const decDeg = parseDec(selectedObj.dec);
    const lat = Number(location.lat);
    const lng = Number(location.lng);
    return {
      ...peakDetails(raH, decDeg, lat, lng, sunsetDate, sunriseDate),
      ...riseSetDuringNight(raH, decDeg, lat, lng, sunsetDate, sunriseDate),
    };
  }, [selectedObj, data, location.lat, location.lng, sunset, sunrise]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center p-4 pt-16 gap-y-1">
      <div className="flex items-stretch gap-4 flex-wrap">
      {/* Location panel */}
      <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-5">
        <div>
          <h1 className="text-white text-lg font-semibold">Your Location</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Enter coordinates or use your device location.
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-zinc-400 text-xs font-medium uppercase tracking-wide">
              Latitude
            </label>
            <input
              type="number"
              min={-90}
              max={90}
              step="any"
              placeholder="e.g. 40.7128"
              value={location.lat}
              onChange={(e) => setLocation((l) => ({ ...l, lat: e.target.value }))}
              className="w-full bg-zinc-800 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-zinc-400 text-xs font-medium uppercase tracking-wide">
              Longitude
            </label>
            <input
              type="number"
              min={-180}
              max={180}
              step="any"
              placeholder="e.g. -74.0060"
              value={location.lng}
              onChange={(e) => setLocation((l) => ({ ...l, lng: e.target.value }))}
              className="w-full bg-zinc-800 text-white placeholder-zinc-600 rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-zinc-400 text-xs font-medium uppercase tracking-wide">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-zinc-400 text-xs font-medium uppercase tracking-wide">
              Minimum altitude
            </label>
            <select
              value={minAltitude}
              onChange={(e) => setMinAltitude(Number(e.target.value))}
              className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:border-zinc-500"
            >
              {[0, 5, 10, 15, 20, 30, 45].map((v) => (
                <option key={v} value={v}>{v}°</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={detectLocation}
          disabled={detecting}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
          {detecting ? "Detecting…" : "Use my location"}
        </button>

        {geoError && <p className="text-red-400 text-sm">{geoError}</p>}

        {isValid && (
          <div className="rounded-lg bg-zinc-800 px-3 py-2 text-xs text-zinc-400 font-mono">
            {Number(location.lat) >= 0 ? "N" : "S"}{" "}
            {Math.abs(Number(location.lat)).toFixed(4)}°,{" "}
            {Number(location.lng) >= 0 ? "E" : "W"}{" "}
            {Math.abs(Number(location.lng)).toFixed(4)}°
          </div>
        )}

        <button
          onClick={saveLocation}
          disabled={!isValid || loading}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Loading…" : "Set location"}
        </button>
      </div>

      {/* Visible Messier objects panel */}
      {visibleObjects && (
        <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-white text-lg font-semibold">Visible Tonight</h2>
              <p className="text-zinc-500 text-sm mt-0.5">
                {visibleObjects.length} of {messierData.length} Messier objects above {minAltitude}°
              </p>
            </div>
            <div className="flex rounded-lg border border-zinc-700 overflow-hidden shrink-0">
              {(["altitude", "magnitude", "size"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setSortBy(opt)}
                  className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                    sortBy === opt
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {opt === "altitude" ? "Altitude" : opt === "magnitude" ? "Magnitude" : "Size"}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto max-h-96 -mr-2 pr-2">
            <div className="grid grid-cols-[1fr_3rem_3rem_4rem] gap-x-3">
              <span className="text-xs font-medium text-zinc-600 uppercase tracking-wide pb-1 border-b border-zinc-800">Object</span>
              <span className="text-xs font-medium text-zinc-600 uppercase tracking-wide pb-1 border-b border-zinc-800 text-right">Alt</span>
              <span className="text-xs font-medium text-zinc-600 uppercase tracking-wide pb-1 border-b border-zinc-800 text-right">Mag</span>
              <span className="text-xs font-medium text-zinc-600 uppercase tracking-wide pb-1 border-b border-zinc-800 text-right">Size</span>
              {[...visibleObjects].sort((a, b) =>
                sortBy === "magnitude" ? a.magnitude - b.magnitude
                : sortBy === "size" ? parseFloat(b.size) - parseFloat(a.size)
                : b.maxAlt - a.maxAlt
              ).map((obj) => (
                <div key={obj.m} className="contents">
                  <button
                    onClick={() => setSelectedM(obj.m === selectedM ? null : obj.m)}
                    className={`col-span-4 grid grid-cols-[1fr_3rem_3rem_4rem] gap-x-3 items-center py-1.5 border-b border-zinc-800 last:border-0 rounded px-1 -mx-1 transition-colors ${
                      obj.m === selectedM ? "bg-zinc-800" : "hover:bg-zinc-800/50"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-white text-sm font-semibold">{obj.m}</span>
                        {obj.common_name && (
                          <span className="text-zinc-400 text-xs truncate">{obj.common_name}</span>
                        )}
                      </div>
                      <span className="text-zinc-600 text-xs">{TYPE_LABEL[obj.type] ?? obj.type}</span>
                    </div>
                    <span className="font-mono text-xs text-indigo-300 text-right">{obj.maxAlt.toFixed(0)}°</span>
                    <span className="font-mono text-xs text-indigo-300 text-right">{obj.magnitude}</span>
                    <span className="font-mono text-xs text-indigo-300 text-right">{obj.size}′</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sun & Moon panel */}
      {(data || loading || fetchError) && (
        <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-4">
          {loading && <p className="text-zinc-400 text-sm">Fetching sun data…</p>}
          {fetchError && <p className="text-red-400 text-sm">{fetchError}</p>}

          {data && (
            <>
              <div>
                <h2 className="text-white text-lg font-semibold">Sun & Moon</h2>
                <p className="text-zinc-500 text-sm mt-0.5">
                  {data.today.day_of_week},{" "}
                  {new Date(data.today.year, data.today.month - 1, data.today.day).toLocaleDateString(
                    undefined,
                    { month: "long", day: "numeric", year: "numeric" }
                  )}
                </p>
                {sunset && sunrise && (
                  <p className="text-zinc-500 text-xs mt-1">
                    {moonNightMessage(data.today.moondata, sunset.time, sunrise.time, data.today.fracillum)}
                  </p>
                )}
              </div>

              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wide font-medium mb-1">Sun</p>
                <div className="divide-y divide-zinc-800">
                  {sunset && <Row label="Sunset" time={sunset.time} />}
                  {sunrise && (
                    <Row label={`Sunrise (${data.tomorrow.day_of_week})`} time={sunrise.time} />
                  )}
                </div>
              </div>

              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wide font-medium mb-1">Moon</p>
                <div className="divide-y divide-zinc-800">
                  {data.today.moondata.map((e) => (
                    <Row key={e.phen} label={e.phen} time={e.time} />
                  ))}
                  <Row label="Phase" time={data.today.curphase} />
                  <Row label="Illumination" time={data.today.fracillum} />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Peak azimuth panel */}
      {peak && selectedObj && (
        <div className="w-full bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-5">
          <div>
            <h2 className="text-white text-lg font-semibold">
              {selectedObj.m}{selectedObj.common_name ? ` — ${selectedObj.common_name}` : ""}
            </h2>
            <p className="text-zinc-500 text-sm mt-0.5 font-mono">
              <span className="text-zinc-600 not-italic text-xs">RA</span> {selectedObj.ra}
              <span className="text-zinc-600 not-italic text-xs ml-3">Dec</span> {selectedObj.dec}
            </p>
          </div>

          <div className="flex gap-4 items-end">
            <img
              key={selectedObj.m}
              src={`/messier/m${selectedObj.m.slice(1)}.webp`}
              alt={selectedObj.m}
              className="w-24 rounded-lg shrink-0"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs uppercase tracking-wide font-medium">
                  <th className="text-left pb-2 font-medium"></th>
                  <th className="text-right pb-2 font-medium">Time</th>
                  <th className="text-right pb-2 font-medium">Azimuth</th>
                  <th className="text-right pb-2 font-medium">Altitude</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {(["rise", "peak", "set"] as const).map((event) => {
                  const isSelected = selectedEvent === event;
                  const label = event === "rise" ? "Rises" : event === "peak" ? "Peak" : "Sets";
                  const time = event === "rise"
                    ? (peak.rise ? peak.rise.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : peak.aboveAtSunset ? "at sunset" : "—")
                    : event === "peak"
                    ? peak.time.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
                    : (peak.set ? peak.set.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : peak.aboveAtSunrise ? "at sunrise" : "—");
                  const bearing = event === "rise"
                    ? (peak.rise ? peak.riseAzimuth!.toFixed(1) + "° " + compassDirection(peak.riseAzimuth!) : peak.aboveAtSunset ? peak.sunsetAzimuth.toFixed(1) + "° " + compassDirection(peak.sunsetAzimuth) : "—")
                    : event === "peak"
                    ? peak.azimuth.toFixed(1) + "° " + compassDirection(peak.azimuth)
                    : (peak.set ? peak.setAzimuth!.toFixed(1) + "° " + compassDirection(peak.setAzimuth!) : peak.aboveAtSunrise ? peak.sunriseAzimuth.toFixed(1) + "° " + compassDirection(peak.sunriseAzimuth) : "—");
                  const alt = event === "rise"
                    ? (peak.aboveAtSunset && !peak.rise ? peak.sunsetAltitude.toFixed(1) + "°" : "—")
                    : event === "peak"
                    ? peak.altitude.toFixed(1) + "°"
                    : (peak.aboveAtSunrise && !peak.set ? peak.sunriseAltitude.toFixed(1) + "°" : "—");
                  return (
                    <tr key={event} onClick={() => setSelectedEvent(event)}
                      className={`cursor-pointer transition-colors ${isSelected ? "bg-zinc-800" : "hover:bg-zinc-800/40"}`}>
                      <td className={`py-2 pl-1 rounded-l ${isSelected ? "text-indigo-300 font-medium" : "text-zinc-400"}`}>{label}</td>
                      <td className="py-2 text-right font-mono text-indigo-300">{time}</td>
                      <td className="py-2 text-right font-mono text-white pl-4">{bearing}</td>
                      <td className="py-2 text-right font-mono text-zinc-500 pl-4 rounded-r">{alt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Compass
              risePoint={
                peak.rise ? { bearing: peak.riseAzimuth!, altitude: 0 }
                : peak.aboveAtSunset ? { bearing: peak.sunsetAzimuth, altitude: peak.sunsetAltitude }
                : null
              }
              peakPoint={{ bearing: peak.azimuth, altitude: peak.altitude }}
              setPoint={
                peak.set ? { bearing: peak.setAzimuth!, altitude: 0 }
                : peak.aboveAtSunrise ? { bearing: peak.sunriseAzimuth, altitude: peak.sunriseAltitude }
                : null
              }
              selected={selectedEvent}
            />
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
