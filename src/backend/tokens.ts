import { randomBytes } from "node:crypto";

/** Unguessable URL-safe token for couple / vendor / share links. */
export function newToken(bytes = 18) {
  return randomBytes(bytes).toString("base64url");
}
