'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROLE_REDIRECT_MAP } from '@/features/auth/constants';
import { useMyProfile } from './useMyProfile';

export const useRoleRedirect = () => {
  const router = useRouter();
  const { data: profile, isLoading, isError } = useMyProfile();
  const [isRedirecting, setIsRedirecting] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    if (isError || !profile) {
      router.replace('/login');
      return;
    }

    const targetPath =
      ROLE_REDIRECT_MAP[profile.role as keyof typeof ROLE_REDIRECT_MAP];

    if (targetPath) {
      router.replace(targetPath);
    } else {
      router.replace('/login');
    }
  }, [isLoading, isError, profile, router]);

  return { isRedirecting: isRedirecting && isLoading };
};
