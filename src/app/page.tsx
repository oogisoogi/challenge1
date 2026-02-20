"use client";

import { Loader2 } from "lucide-react";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useRoleRedirect } from "@/features/auth/hooks/useRoleRedirect";

export default function Home() {
  const { isAuthenticated, isLoading: isAuthLoading } = useCurrentUser();
  const { isRedirecting } = useRoleRedirect();

  if (isAuthLoading || isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">리다이렉트 중...</p>
        </div>
      </div>
    );
  }

  return null;
}
