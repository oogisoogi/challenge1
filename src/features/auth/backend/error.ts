export const authErrorCodes = {
  signupDuplicateEmail: 'AUTH_SIGNUP_DUPLICATE_EMAIL',
  signupFailed: 'AUTH_SIGNUP_FAILED',
  onboardingProfileExists: 'AUTH_ONBOARDING_PROFILE_EXISTS',
  onboardingInsertFailed: 'AUTH_ONBOARDING_INSERT_FAILED',
  onboardingValidation: 'AUTH_ONBOARDING_VALIDATION_ERROR',
  unauthorized: 'AUTH_UNAUTHORIZED',
} as const;

type AuthErrorValue = (typeof authErrorCodes)[keyof typeof authErrorCodes];

export type AuthServiceError = AuthErrorValue;
