import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "../public/messier");

const IMAGES = [
  [6,   "//upload.wikimedia.org/wikipedia/commons/thumb/7/7f/M6a.jpg/120px-M6a.jpg"],
  [18,  "//upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Messier18.jpg/120px-Messier18.jpg"],
  [21,  "//upload.wikimedia.org/wikipedia/commons/thumb/2/28/Messier_object_021.jpg/120px-Messier_object_021.jpg"],
  [23,  "//upload.wikimedia.org/wikipedia/commons/thumb/6/63/Messier_object_023.jpg/120px-Messier_object_023.jpg"],
  [25,  "//upload.wikimedia.org/wikipedia/commons/thumb/8/88/Messier_object_025.jpg/120px-Messier_object_025.jpg"],
  [26,  "//upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Messier_26.jpg/120px-Messier_26.jpg"],
  [29,  "//upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Messier_29.jpg/120px-Messier_29.jpg"],
  [34,  "//upload.wikimedia.org/wikipedia/commons/thumb/7/7e/M34_2mass_atlas.jpg/120px-M34_2mass_atlas.jpg"],
  [36,  "//upload.wikimedia.org/wikipedia/commons/thumb/3/3d/M36a.jpg/120px-M36a.jpg"],
  [37,  "//upload.wikimedia.org/wikipedia/commons/thumb/4/46/M37a.jpg/120px-M37a.jpg"],
  [38,  "//upload.wikimedia.org/wikipedia/commons/thumb/0/09/M38_Open_Cluster.jpg/120px-M38_Open_Cluster.jpg"],
  [39,  "//upload.wikimedia.org/wikipedia/commons/thumb/6/67/M39atlas.jpg/120px-M39atlas.jpg"],
  [40,  "//upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Messier_object_40.jpg/120px-Messier_object_40.jpg"],
  [41,  "//upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Messier_041_2MASS.jpg/120px-Messier_041_2MASS.jpg"],
  [47,  "//upload.wikimedia.org/wikipedia/commons/thumb/5/55/M47a.jpg/120px-M47a.jpg"],
  [50,  "//upload.wikimedia.org/wikipedia/commons/thumb/3/3b/M50a.jpg/120px-M50a.jpg"],
  [52,  "//upload.wikimedia.org/wikipedia/commons/thumb/b/bc/M52atlas.jpg/120px-M52atlas.jpg"],
  [73,  "//upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Messier_073_2MASS.jpg/120px-Messier_073_2MASS.jpg"],
  [93,  "//upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Messier_object_093.jpg/120px-Messier_object_093.jpg"],
  [97,  "//upload.wikimedia.org/wikipedia/commons/thumb/e/e7/M97-stargazer-obs.jpg/120px-M97-stargazer-obs.jpg"],
  [103, "//upload.wikimedia.org/wikipedia/commons/thumb/0/06/Messier_object_103.jpg/120px-Messier_object_103.jpg"],
];

function fullSizeUrl(thumbUrl) {
  // //upload.wikimedia.org/wikipedia/commons/thumb/a/ab/File.jpg/120px-File.jpg
  // → https://upload.wikimedia.org/wikipedia/commons/a/ab/File.jpg
  return "https:" + thumbUrl.replace(/\/thumb(\/[^/]+\/[^/]+\/[^/]+)\/\d+px-.+$/, "$1");
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

let ok = 0, fail = 0;
for (const [number, thumbUrl] of IMAGES) {
  const url = fullSizeUrl(thumbUrl);
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(OUT_DIR, `m${number}.webp`), buf);
    console.log(`✓ M${number} → ${url.split("/").pop()}`);
    ok++;
  } catch (e) {
    console.error(`✗ M${number}: ${e.message} (${url})`);
    fail++;
  }
  await sleep(300);
}
console.log(`\nDone: ${ok} downloaded, ${fail} failed`);
