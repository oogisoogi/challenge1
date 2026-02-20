'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ROLE_REDIRECT_MAP } from '@/features/auth/constants';
import { useCurrentUser } from './useCurrentUser';
import { useMyProfile } from './useMyProfile';

type RoleRedirectState = {
  status: 'loading' | 'redirecting' | 'error';
  errorMessage?: string;
};

export const useRoleRedirect = (): RoleRedirectState => {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useCurrentUser();
  const { data: profile, isLoading: isProfileLoading, isError, error } = useMyProfile();

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (isProfileLoading) return;

    if (isError || !profile) return;

    const targetPath =
      ROLE_REDIRECT_MAP[profile.role as keyof typeof ROLE_REDIRECT_MAP];

    if (targetPath) {
      router.replace(targetPath);
    }
  }, [isAuthLoading, isAuthenticated, isProfileLoading, isError, profile, router]);

  if (isAuthLoading || isProfileLoading) {
    return { status: 'loading' };
  }

  if (isError || !profile) {
    return {
      status: 'error',
      errorMessage: error instanceof Error ? error.message : '프로필을 불러올 수 없습니다.',
    };
  }

  return { status: 'redirecting' };
};
