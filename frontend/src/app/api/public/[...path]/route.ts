import { NextRequest, NextResponse } from "next/server";
import { backendBase } from "@/lib/session";

/**
 * Unauthenticated same-origin proxy for the backend's public endpoints
 * (share-location links). The BFF proxy at /api/proxy requires a session
 * cookie, and browsers cannot reach the backend host directly, so public
 * pages go through here. Only whitelisted prefixes are forwarded.
 */
const ALLOWED_PREFIXES = ["share/"];

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const joined = path.map(encodeURIComponent).join("/");
  if (!ALLOWED_PREFIXES.some((p) => joined.startsWith(p))) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }
  const upstream = await fetch(`${backendBase()}/api/v1/public/${joined}${req.nextUrl.search}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}
