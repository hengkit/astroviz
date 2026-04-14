import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../public/messier");

const PAGES = [
  [1,"messier-1"],[2,"messier-2"],[3,"messier-3"],[4,"messier-4"],[5,"messier-5"],
  [7,"messier-7"],[8,"messier-8"],[9,"messier-9"],[10,"messier-10"],[11,"messier-11"],
  [12,"messier-12"],[13,"messier-13"],[14,"messier-14"],[15,"messier-15"],[16,"messier-16"],
  [17,"messier-17"],[19,"messier-19"],[20,"messier-20"],[22,"messier-22"],[24,"messier-24"],
  [27,"messier-27"],[28,"messier-28"],[30,"messier-30"],[31,"messier-31"],[32,"messier-32"],
  [33,"messier-33"],[35,"messier-35"],[42,"messier-42"],[43,"messier-43"],[44,"messier-44"],
  [45,"messier-45"],[46,"messier-46"],[48,"messier-48"],[49,"messier-49"],[51,"messier-51"],
  [53,"messier-53"],[54,"messier-54"],[55,"messier-55"],[56,"messier-56"],[57,"messier-57"],
  [58,"messier-58"],[59,"messier-59"],[60,"messier-60"],[61,"messier-61"],[62,"messier-62"],
  [63,"messier-63"],[64,"messier-64"],[65,"messier-65"],[66,"messier-66"],[67,"messier-67"],
  [68,"messier-68"],[69,"messier-69"],[70,"messier-70"],[71,"messier-71"],[72,"messier-72"],
  [74,"messier-74"],[75,"messier-75"],[76,"messier-76"],[77,"messier-77"],[78,"messier-78"],
  [79,"messier-79"],[80,"messier-80"],[81,"messier-81"],[82,"messier-82"],[83,"messier-83"],
  [84,"messier-84"],[85,"messier-85"],[86,"messier-86"],[87,"messier-87"],[88,"messier-88"],
  [89,"messier-89"],[90,"messier-90"],[91,"messier-91"],[92,"messier-92"],[94,"messier-94"],
  [95,"messier-95"],[96,"messier-96"],[98,"messier-98"],[99,"messier-99"],[100,"messier-100"],
  [101,"messier-101"],[102,"messier-102"],[104,"messier-104"],[105,"messier-105"],[106,"messier-106"],
  [107,"messier-107"],[108,"messier-108"],[109,"messier-109"],[110,"messier-110"],
];

const BASE = "https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/";

async function fetchImageUrl(slug) {
  const res = await fetch(`${BASE}${slug}/`);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${slug}`);
  const html = await res.text();

  // Try og:image meta tag first (most reliable)
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatch) return ogMatch[1].split("?")[0];

  // Fallback: first wp-content webp upload
  const wpMatch = html.match(/https:\/\/science\.nasa\.gov\/wp-content\/uploads\/[^"'\s]+\.webp/);
  if (wpMatch) return wpMatch[0].split("?")[0];

  throw new Error(`No image found for ${slug}`);
}

async function downloadImage(url, number) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const dest = join(OUT_DIR, `m${number}.webp`);
  writeFileSync(dest, buf);
  return dest;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let ok = 0, fail = 0;
for (const [number, slug] of PAGES) {
  try {
    const imgUrl = await fetchImageUrl(slug);
    const dest = await downloadImage(imgUrl, number);
    console.log(`✓ M${number} → ${dest.split("/").pop()} (${imgUrl.split("/").pop()})`);
    ok++;
  } catch (e) {
    console.error(`✗ M${number}: ${e.message}`);
    fail++;
  }
  await sleep(300);
}

console.log(`\nDone: ${ok} downloaded, ${fail} failed`);
