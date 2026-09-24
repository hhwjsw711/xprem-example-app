// Verify the xprem manifest signature against the app-embedded certificate,
// replicating what expo-updates does on device.
const crypto = require("crypto");
const fs = require("fs");

const body = fs.readFileSync(process.env.TEMP + "\\verify-body.bin");
const certPem = fs.readFileSync("E:/Workspace/xprem-ota-keys/certificate.pem", "utf8");
const cert = new crypto.X509Certificate(certPem);
const publicKey = cert.publicKey;

// Part headers end at first \r\n\r\n; part content runs to the next \r\n--boundary
const sep = body.indexOf(Buffer.from("\r\n\r\n"));
if (sep < 0) throw new Error("no header/body separator");
const headers = body.subarray(0, sep).toString("utf8");
let content = body.subarray(sep + 4);
const closing = content.indexOf(Buffer.from("\r\n--"));
if (closing >= 0) content = content.subarray(0, closing);

const sigMatch = /expo-signature:\s*sig="([^"]+)"/.exec(headers);
if (!sigMatch) throw new Error("no expo-signature in part headers");
const sig = Buffer.from(sigMatch[1], "base64");

const ok = crypto.verify("sha256", content, { key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING }, sig);
console.log("content length:", content.length);
console.log("SIGNATURE VALID:", ok);

const manifest = JSON.parse(content.toString("utf8"));
console.log("manifest update id:", manifest.id);
console.log("runtimeVersion:", manifest.runtimeVersion);
console.log("launchAsset present:", !!manifest.launchAsset?.url);
