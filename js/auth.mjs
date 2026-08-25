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

export function createAuthPersistence(local, session, key) {
  return {
    isUnlocked() {
      if (local.getItem(key) === "unlocked") return true;
      if (session.getItem(key) !== "unlocked") return false;
      local.setItem(key, "unlocked");
      return true;
    },
    remember() {
      local.setItem(key, "unlocked");
      session.removeItem(key);
    },
    forget() {
      local.removeItem(key);
      session.removeItem(key);
    },
  };
}
