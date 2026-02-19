export const courseErrorCodes = {
  notFound: 'COURSE_NOT_FOUND',
  notPublished: 'COURSE_NOT_PUBLISHED',
  alreadyEnrolled: 'COURSE_ALREADY_ENROLLED',
  notEnrolled: 'COURSE_NOT_ENROLLED',
  forbiddenRole: 'COURSE_FORBIDDEN_ROLE',
  unauthorized: 'COURSE_UNAUTHORIZED',
  fetchError: 'COURSE_FETCH_ERROR',
  enrollFailed: 'COURSE_ENROLL_FAILED',
  cancelFailed: 'COURSE_CANCEL_FAILED',
  validationError: 'COURSE_VALIDATION_ERROR',
} as const;

type CourseErrorValue = (typeof courseErrorCodes)[keyof typeof courseErrorCodes];

export type CourseServiceError = CourseErrorValue;
