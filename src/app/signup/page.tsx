"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { SignupForm } from "@/features/auth/components/signup-form";

type SignupPageProps = {
  params: Promise<Record<string, never>>;
};

export default function SignupPage({ params }: SignupPageProps) {
  void params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useCurrentUser();

  useEffect(() => {
    if (isAuthenticated) {
      const redirectedFrom = searchParams.get("redirectedFrom") ?? "/";
      router.replace(redirectedFrom);
    }
  }, [isAuthenticated, router, searchParams]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center gap-10 px-6 py-16">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-semibold">회원가입</h1>
        <p className="text-slate-500">
          계정을 만들고 학습을 시작하세요.
        </p>
      </header>
      <div className="w-full">
        <SignupForm />
      </div>
    </div>
  );
}
