"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useRoleRedirect } from "@/features/auth/hooks/useRoleRedirect";

export default function Home() {
  const { isAuthenticated, isLoading: isAuthLoading } = useCurrentUser();
  const redirectState = useRoleRedirect();

  if (isAuthLoading) {
    return <RedirectLoading />;
  }

  if (!isAuthenticated) {
    return null;
  }

  if (redirectState.status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-red-500">{redirectState.errorMessage}</p>
          <Link
            href="/login"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            로그인 페이지로 이동
          </Link>
        </div>
      </div>
    );
  }

  return <RedirectLoading />;
}

function RedirectLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <p className="text-sm text-slate-500">리다이렉트 중...</p>
      </div>
    </div>
  );
}
