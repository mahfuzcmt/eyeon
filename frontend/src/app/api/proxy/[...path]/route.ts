import { NextRequest, NextResponse } from "next/server";
import { backendBase, readSession } from "@/lib/session";
import { expiresSoon, refreshSession } from "@/lib/sessionRefresh";

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

async function forward(req: NextRequest, path: string[]): Promise<NextResponse> {
  if (!ALLOWED_METHODS.has(req.method)) {
    return NextResponse.json({ error: { code: "METHOD_NOT_ALLOWED" } }, { status: 405 });
  }
  let session = await readSession();
  if (!session) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  }

  const search = req.nextUrl.search;
  const url = `${backendBase()}/api/v1/${path.map(encodeURIComponent).join("/")}${search}`;

  const ct = req.headers.get("content-type");
  const hasBody = req.method !== "GET" && req.method !== "DELETE";
  const body = hasBody ? Buffer.from(await req.arrayBuffer()) : undefined;

  const send = (accessToken: string): Promise<Response> => {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: req.headers.get("accept") ?? "application/json",
    };
    if (ct) headers["Content-Type"] = ct;
    return fetch(url, { method: req.method, headers, body, cache: "no-store", redirect: "manual" });
  };

  // The access token lives an hour. Exchange the refresh token shortly before it runs out,
  // or when the backend answers 401 anyway, and send the request once more. The session ends
  // only when the backend refuses the refresh token itself.
  let refreshed = false;
  if (expiresSoon(session)) {
    const r = await refreshSession(session);
    if (r.kind === "refused") {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
    }
    if (r.kind === "ok") {
      session = r.session;
      refreshed = true;
    }
  }

  let upstream = await send(session.accessToken);
  if (upstream.status === 401 && !refreshed) {
    const r = await refreshSession(session);
    if (r.kind === "ok") {
      upstream = await send(r.session.accessToken);
    } else if (r.kind === "unavailable") {
      // Not a sign-out: the browser keeps its session and the next request tries again.
      return NextResponse.json(
        { error: { code: "REFRESH_UNAVAILABLE", message: "Could not renew the session, try again" } },
        { status: 503 },
      );
    }
  }

  const respHeaders = new Headers();
  const respCt = upstream.headers.get("content-type");
  if (respCt) respHeaders.set("content-type", respCt);
  const respCd = upstream.headers.get("content-disposition");
  if (respCd) respHeaders.set("content-disposition", respCd);
  // Only images: a person's photo is versioned by its URL and may be kept by the browser.
  const respCc = upstream.headers.get("cache-control");
  if (respCc && respCt?.startsWith("image/")) respHeaders.set("cache-control", respCc);
  // 204/205/304 must have a null body: passing even an empty buffer makes the
  // Fetch Response constructor throw, which surfaced as a 500 on every DELETE
  // and on group assign/unassign.
  const nullBody = upstream.status === 204 || upstream.status === 205 || upstream.status === 304;
  const respBody = nullBody ? null : await upstream.arrayBuffer();
  return new NextResponse(respBody, { status: upstream.status, headers: respHeaders });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, (await ctx.params).path);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, (await ctx.params).path);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, (await ctx.params).path);
}
