"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useMyProfile } from "@/features/auth/hooks/useMyProfile";
import { ROLE_REDIRECT_MAP } from "@/features/auth/constants";

const ROLE_NAV_CONFIG = {
  learner: [
    { href: "/courses/my", label: "내 코스", icon: BookOpen },
  ],
  instructor: [
    { href: "/instructor/dashboard", label: "강사 대시보드", icon: LayoutDashboard },
  ],
  operator: [
    { href: "/operator/dashboard", label: "운영 대시보드", icon: Shield },
  ],
} as const;

export const AppHeader = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useCurrentUser();
  const { data: profile } = useMyProfile();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }, [router]);

  const roleNav =
    profile?.role && profile.role in ROLE_NAV_CONFIG
      ? ROLE_NAV_CONFIG[profile.role as keyof typeof ROLE_NAV_CONFIG]
      : [];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-slate-900" />
          <span className="text-lg font-semibold text-slate-900">LMS</span>
        </Link>

        <nav className="flex items-center gap-2">
          {isAuthLoading ? null : !isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">로그인</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">회원가입</Link>
              </Button>
            </>
          ) : (
            <>
              {roleNav.map(({ href, label, icon: Icon }) => (
                <Button key={href} variant="ghost" size="sm" asChild>
                  <Link href={href} className="flex items-center gap-1.5">
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                </Button>
              ))}
              {profile && (
                <span className="text-xs text-slate-500">
                  {profile.name}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-slate-500 hover:text-slate-700"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
