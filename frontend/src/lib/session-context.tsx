"use client";

import { createContext, useContext, type ReactNode } from "react";

interface SessionCtx {
  userId: string;
  orgId: string;
  email: string;
  role: string;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ value, children }: { value: SessionCtx; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession must be used within SessionProvider");
  return v;
}
