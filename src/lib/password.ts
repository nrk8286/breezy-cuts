const ITERATIONS = 100_000;
const BYTES = 32;
const toHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
function fromHex(value: string) { return /^[0-9a-f]+$/i.test(value) && value.length % 2 === 0 ? new Uint8Array(value.match(/.{2}/g)!.map((part) => Number.parseInt(part, 16))) : null; }
async function derive(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: ITERATIONS }, key, BYTES * 8));
}
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256:${ITERATIONS}:${toHex(salt)}:${toHex(await derive(password, salt))}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [algorithm, iterations, saltHex, hashHex] = stored.split(":");
  if (algorithm !== "pbkdf2-sha256" || Number(iterations) !== ITERATIONS) return false;
  const salt = fromHex(saltHex); const expected = fromHex(hashHex);
  if (!salt || !expected) return false;
  const actual = await derive(password, salt); if (actual.length !== expected.length) return false;
  let difference = 0; for (let i = 0; i < actual.length; i += 1) difference |= actual[i] ^ expected[i];
  return difference === 0;
}
