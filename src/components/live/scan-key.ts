/** SHA-256 hex of a booking token; matches `scanKey` on the server so offline scans can find the booking. */
export async function scanKey(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
