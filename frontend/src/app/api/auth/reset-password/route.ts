import { NextRequest, NextResponse } from "next/server";
import { backendBase } from "@/lib/session";

/** Public: forwards to the backend without a session. The backend never reveals whether an email exists. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.code || !body?.newPassword) {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "missing fields" } }, { status: 400 });
  }
  const r = await fetch(`${backendBase()}/api/v1/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!r.ok) {
    const errBody = await r.json().catch(() => ({ error: { code: "REQUEST_FAILED", message: "Request failed" } }));
    return NextResponse.json(errBody, { status: r.status });
  }
  return new NextResponse(null, { status: 204 });
}
