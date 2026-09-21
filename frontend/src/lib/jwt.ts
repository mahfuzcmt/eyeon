// Server-only: read the `exp` claim from a JWT without verifying. Verification
// happens on the backend; the BFF just needs the expiry to time the cookie and
// to know when to refresh. Never trust these claims for authorization.

interface JwtPayload {
  exp?: number;
  sub?: string;
  org?: string;
  role?: string;
}

export function decodeJwt(token: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) return {};
  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(json) as JwtPayload;
  } catch {
    return {};
  }
}

export function jwtExpiresAtMs(token: string): number {
  const exp = decodeJwt(token).exp;
  return exp ? exp * 1000 : Date.now() + 15 * 60_000;
}
