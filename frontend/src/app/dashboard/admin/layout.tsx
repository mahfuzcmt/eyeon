"use client";

import { useSession } from "@/lib/session-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (role !== "SUPER_ADMIN") {
      router.replace("/dashboard");
    }
  }, [role, router]);

  if (role !== "SUPER_ADMIN") {
    return (
      <div className="flex h-full items-center justify-center bg-surface-50">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-ink-900">Access Denied</h1>
          <p className="mt-2 text-[14px] text-ink-500">
            You need Super Admin privileges to access this section.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
