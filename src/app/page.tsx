"use client";

import { useCallback, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
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
    return <ProfileErrorFallback errorMessage={redirectState.errorMessage} />;
  }

  return <RedirectLoading />;
}

function ProfileErrorFallback({ errorMessage }: { errorMessage?: string }) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleSignOutAndNavigate = useCallback(async (destination: string) => {
    setIsNavigating(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace(destination);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-red-500">
          {errorMessage ?? '프로필을 불러올 수 없습니다.'}
        </p>
        <p className="text-sm text-slate-500">
          프로필이 등록되지 않은 계정입니다. 회원가입을 진행하거나 다른 계정으로 로그인해주세요.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleSignOutAndNavigate('/login')}
            disabled={isNavigating}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            로그아웃
          </button>
          <button
            type="button"
            onClick={() => handleSignOutAndNavigate('/signup')}
            disabled={isNavigating}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
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
