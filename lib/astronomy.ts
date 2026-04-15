export function parseRA(ra: string): number {
  // NGC format: "05:34:27.05"
  const c = ra.match(/(\d+):(\d+):([\d.]+)/);
  if (c) return +c[1] + +c[2] / 60 + +c[3] / 3600;
  // Messier format: "5h 34.5m"
  const h = ra.match(/(\d+)h\s*([\d.]+)m/);
  if (h) return +h[1] + +h[2] / 60;
  return 0;
}

export function parseDec(dec: string): number {
  // NGC format: "+27:43:03.6"
  const c = dec.match(/([+-]?)(\d+):(\d+):([\d.]+)/);
  if (c) {
    const sign = c[1] === "-" ? -1 : 1;
    return sign * (+c[2] + +c[3] / 60 + +c[4] / 3600);
  }
  // Messier format: "+22° 01′"
  const d = dec.match(/([+-]?)(\d+)°\s*(\d+)/);
  if (d) {
    const sign = d[1] === "-" ? -1 : 1;
    return sign * (+d[2] + +d[3] / 60);
  }
  return 0;
}

function gstDeg(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545) / 36525;
  const gst = 280.46061837 + 360.98564736629 * (jd - 2451545) + T * T * 0.000387933;
  return ((gst % 360) + 360) % 360;
}

function lstH(date: Date, lngDeg: number): number {
  return (((gstDeg(date) + lngDeg) % 360) + 360) % 360 / 15;
}

function altitudeDeg(raH: number, decDeg: number, latDeg: number, lst: number): number {
  const haRad = (lst - raH) * 15 * (Math.PI / 180);
  const lat = latDeg * (Math.PI / 180);
  const dec = decDeg * (Math.PI / 180);
  const sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(haRad);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) * (180 / Math.PI);
}

function azimuthDeg(raH: number, decDeg: number, latDeg: number, lst: number): number {
  const haRad = (lst - raH) * 15 * (Math.PI / 180);
  const lat = latDeg * (Math.PI / 180);
  const dec = decDeg * (Math.PI / 180);
  const x = Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.cos(haRad) * Math.sin(lat);
  const y = -Math.cos(dec) * Math.sin(haRad);
  return ((Math.atan2(y, x) * (180 / Math.PI)) + 360) % 360;
}

export function compassDirection(az: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(az / 45) % 8];
}

export function maxAltitudeDuringNight(
  raH: number,
  decDeg: number,
  latDeg: number,
  lngDeg: number,
  sunsetDate: Date,
  sunriseDate: Date,
  steps = 96
): number {
  const duration = sunriseDate.getTime() - sunsetDate.getTime();
  let max = -90;
  for (let i = 0; i <= steps; i++) {
    const t = new Date(sunsetDate.getTime() + (i / steps) * duration);
    const alt = altitudeDeg(raH, decDeg, latDeg, lstH(t, lngDeg));
    if (alt > max) max = alt;
  }
  return max;
}

export function riseSetDuringNight(
  raH: number,
  decDeg: number,
  latDeg: number,
  lngDeg: number,
  sunsetDate: Date,
  sunriseDate: Date,
  steps = 288 // ~2.5 min intervals for a 12h night
): { rise: Date | null; riseAzimuth: number | null; set: Date | null; setAzimuth: number | null; aboveAtSunset: boolean; aboveAtSunrise: boolean; sunsetAzimuth: number; sunsetAltitude: number; sunriseAzimuth: number; sunriseAltitude: number } {
  const duration = sunriseDate.getTime() - sunsetDate.getTime();
  const times = Array.from({ length: steps + 1 }, (_, i) =>
    new Date(sunsetDate.getTime() + (i / steps) * duration)
  );
  const alts = times.map((t) => altitudeDeg(raH, decDeg, latDeg, lstH(t, lngDeg)));

  let rise: Date | null = null;
  let riseAzimuth: number | null = null;
  let set: Date | null = null;
  let setAzimuth: number | null = null;

  for (let i = 0; i < steps; i++) {
    if (alts[i] < 0 && alts[i + 1] >= 0 && rise === null) {
      const frac = -alts[i] / (alts[i + 1] - alts[i]);
      rise = new Date(times[i].getTime() + frac * (times[i + 1].getTime() - times[i].getTime()));
      riseAzimuth = azimuthDeg(raH, decDeg, latDeg, lstH(rise, lngDeg));
    } else if (alts[i] >= 0 && alts[i + 1] < 0) {
      const frac = alts[i] / (alts[i] - alts[i + 1]);
      set = new Date(times[i].getTime() + frac * (times[i + 1].getTime() - times[i].getTime()));
      setAzimuth = azimuthDeg(raH, decDeg, latDeg, lstH(set, lngDeg));
    }
  }

  const sunsetAzimuth = azimuthDeg(raH, decDeg, latDeg, lstH(times[0], lngDeg));
  const sunsetAltitude = alts[0];
  const sunriseAzimuth = azimuthDeg(raH, decDeg, latDeg, lstH(times[steps], lngDeg));
  const sunriseAltitude = alts[steps];

  return { rise, riseAzimuth, set, setAzimuth, aboveAtSunset: alts[0] >= 0, aboveAtSunrise: alts[steps] >= 0, sunsetAzimuth, sunsetAltitude, sunriseAzimuth, sunriseAltitude };
}

export function peakDetails(
  raH: number,
  decDeg: number,
  latDeg: number,
  lngDeg: number,
  sunsetDate: Date,
  sunriseDate: Date,
  steps = 96
): { time: Date; azimuth: number; altitude: number } {
  const duration = sunriseDate.getTime() - sunsetDate.getTime();
  let maxAlt = -90;
  let peakTime = sunsetDate;
  let peakAz = 0;

  for (let i = 0; i <= steps; i++) {
    const t = new Date(sunsetDate.getTime() + (i / steps) * duration);
    const lst = lstH(t, lngDeg);
    const alt = altitudeDeg(raH, decDeg, latDeg, lst);
    if (alt > maxAlt) {
      maxAlt = alt;
      peakTime = t;
      peakAz = azimuthDeg(raH, decDeg, latDeg, lst);
    }
  }

  return { time: peakTime, azimuth: peakAz, altitude: maxAlt };
}
