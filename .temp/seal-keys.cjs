// Seal my private key + certificate into xprem's DB keys format
// Go: SealAESGCM = AES-256-GCM, output = nonce(12) || ciphertext || tag, base64
const crypto = require("crypto");
const fs = require("fs");

const APP_ID = "2ab82ee4-d6bb-47ce-b0c2-4a0914dc12fc";
const MASTER_KEY_B64 = "Or6aRrHodLQsvSxwSHBIs+pUR8Y0beSfEVB2p5C8HkU=";

function seal(plaintext, aadStr) {
  const masterKey = Buffer.from(MASTER_KEY_B64, "base64");
  if (masterKey.length !== 32) throw new Error("master key must be 32 bytes, got " + masterKey.length);
  const aad = Buffer.from(aadStr, "utf8");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey, iv);
  cipher.setAAD(aad);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString("base64");
}

const certPem = fs.readFileSync("E:/Workspace/xprem-ota-keys/certificate.pem", "utf8").trim();
const privPem = fs.readFileSync("E:/Workspace/xprem-ota-keys/private-key.pem", "utf8").trim();

// Self-test: unseal must round-trip (Node GCM decrypt)
function unseal(b64, aadStr) {
  const masterKey = Buffer.from(MASTER_KEY_B64, "base64");
  const blob = Buffer.from(b64, "base64");
  const iv = blob.subarray(0, 12);
  const ct = blob.subarray(12, blob.length - 16);
  const tag = blob.subarray(blob.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, iv);
  decipher.setAAD(Buffer.from(aadStr, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

const sealedPublic = seal(certPem, APP_ID + "|public");
const sealedPrivate = seal(privPem, APP_ID + "|private");

const okPub = unseal(sealedPublic, APP_ID + "|public") === certPem;
const okPriv = unseal(sealedPrivate, APP_ID + "|private") === privPem;
console.log("roundtrip public:", okPub, "private:", okPriv);

fs.writeFileSync("E:/Workspace/vibeapps/.temp/xprem-example-app/.temp/sealed-keys.json",
  JSON.stringify({ sealedPublic, sealedPrivate }, null, 2));
console.log("saved sealed-keys.json");
