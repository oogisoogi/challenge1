"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { OnboardingForm } from "@/features/auth/components/onboarding-form";
import { LOGIN_PATH } from "@/constants/auth";

type OnboardingPageProps = {
  params: Promise<Record<string, never>>;
};

export default function OnboardingPage({ params }: OnboardingPageProps) {
  void params;
  const router = useRouter();
  const { isAuthenticated, isLoading } = useCurrentUser();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const redirectUrl = new URL(LOGIN_PATH, window.location.origin);
      redirectUrl.searchParams.set("redirectedFrom", "/onboarding");
      router.replace(redirectUrl.toString());
    }
  }, [isAuthenticated, isLoading, router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center gap-8 px-6 py-16">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-semibold">프로필 설정</h1>
        <p className="text-slate-500">
          역할을 선택하고 기본 정보를 입력해주세요.
        </p>
      </header>
      <div className="w-full rounded-xl border border-slate-200 p-6 shadow-sm">
        <OnboardingForm />
      </div>
    </div>
  );
}
