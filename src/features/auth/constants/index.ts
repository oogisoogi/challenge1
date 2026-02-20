export const ROLE_REDIRECT_MAP = {
  learner: '/courses',
  instructor: '/instructor/dashboard',
  operator: '/operator/dashboard',
} as const;

export type UserRole = keyof typeof ROLE_REDIRECT_MAP;
