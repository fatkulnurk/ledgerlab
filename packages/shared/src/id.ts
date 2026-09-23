/**
 * Environment-agnostic id generation. Avoids `node:crypto` so this module can
 * also be bundled into the browser dashboard. Uses the Web Crypto API when
 * available (Node 20+ and all modern browsers) and falls back to Math.random.
 */

function randomHex(byteLength: number): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    const buffer = new Uint8Array(byteLength);
    cryptoObj.getRandomValues(buffer);
    return Array.from(buffer, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  let out = "";
  for (let i = 0; i < byteLength; i += 1) {
    out += Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0");
  }
  return out;
}

/** Create a prefixed, collision-resistant id such as `je_9f2c1a...`. */
export function createId(prefix: string): string {
  return `${prefix}_${randomHex(10)}`;
}
