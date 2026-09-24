import fs from "fs";
import path from "path";
import crypto from "crypto";

const SERVER = "https://nvidia-desktop.tail11800a.ts.net";
const APP_ID = "2ab82ee4-d6bb-47ce-b0c2-4a0914dc12fc";
const BRANCH = "production";
const TOKEN = process.env.EOO_TOKEN;
const DIST_DIR = path.join(process.cwd(), "dist");
const RUNTIME_VERSION = "1.0.0";
const PLATFORM = "ios";

if (!TOKEN) { console.error("EOO_TOKEN not set"); process.exit(1); }

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function md5(file) {
  return crypto.createHash("md5").update(fs.readFileSync(file)).digest("hex");
}

async function main() {
  const metadata = JSON.parse(fs.readFileSync(path.join(DIST_DIR, "metadata.json"), "utf8"));
  const files = [];
  const bundleRel = metadata.fileMetadata[PLATFORM].bundle;
  const bundlePath = path.join(DIST_DIR, bundleRel);
  files.push({ path: bundleRel, hash: sha256(bundlePath), key: md5(bundlePath), ext: "hbc", role: "launch" });
  for (const a of metadata.fileMetadata[PLATFORM].assets) {
    const p = path.join(DIST_DIR, a.path);
    files.push({ path: a.path, hash: sha256(p), key: md5(p), ext: a.ext || "bin", role: "asset" });
  }
  for (const f of ["metadata.json", "expoConfig.json"]) {
    const p = path.join(DIST_DIR, f);
    if (fs.existsSync(p)) files.push({ path: f, hash: sha256(p), key: md5(p), ext: "json", role: "config" });
  }
  console.log(`Files: ${files.length}`);

  const url = new URL(`${SERVER}/${APP_ID}/requestUploadUrl/${BRANCH}`);
  url.searchParams.set("runtimeVersion", RUNTIME_VERSION);
  url.searchParams.set("platform", PLATFORM);
  url.searchParams.set("commitHash", "");
  const res1 = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${TOKEN}` },
    body: JSON.stringify({ files }),
  });
  const text1 = await res1.text();
  if (!res1.ok) throw new Error(`requestUploadUrl ${res1.status}: ${text1}`);
  const data = JSON.parse(text1);
  console.log(`Update ID: ${data.updateId}, requests: ${data.uploadRequests.length}`);

  let uploaded = 0;
  for (const item of data.uploadRequests) {
    const filePath = path.join(DIST_DIR, item.originalFileName);
    if (!fs.existsSync(filePath)) throw new Error(`Missing: ${item.originalFileName}`);
    const content = fs.readFileSync(filePath);
    const form = new FormData();
    form.append("file", new Blob([content]), item.fileName || item.originalFileName);
    const headers = { ...(item.headers || {}), "Authorization": `Bearer ${TOKEN}` };
    const res2 = await fetch(item.requestUploadUrl, { method: "PUT", body: form, headers });
    if (!res2.ok) throw new Error(`Upload ${item.originalFileName} ${res2.status}: ${await res2.text()}`);
    uploaded++;
  }
  console.log(`Uploaded ${uploaded}/${data.uploadRequests.length}`);

  const url3 = new URL(`${SERVER}/${APP_ID}/markUpdateAsUploaded/${BRANCH}`);
  url3.searchParams.set("runtimeVersion", RUNTIME_VERSION);
  url3.searchParams.set("platform", PLATFORM);
  url3.searchParams.set("updateId", String(data.updateId));
  const res3 = await fetch(url3, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${TOKEN}` },
    body: JSON.stringify({ files }),
  });
  const text3 = await res3.text();
  if (!res3.ok) throw new Error(`markUpdateAsUploaded ${res3.status}: ${text3}`);
  console.log("Update published!");
}
main().catch(e => { console.error(e.message); process.exit(1); });