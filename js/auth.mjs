export async function hashPassword(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPassword(value, expectedHash) {
  if (!value) return false;
  return (await hashPassword(value)) === expectedHash;
}
