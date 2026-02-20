export const gradesErrorCodes = {
  unauthorized: 'GRADES_UNAUTHORIZED',
  forbiddenRole: 'GRADES_FORBIDDEN_ROLE',
  notEnrolled: 'GRADES_NOT_ENROLLED',
  notFound: 'GRADES_NOT_FOUND',
  forbidden: 'GRADES_FORBIDDEN',
  fetchError: 'GRADES_FETCH_ERROR',
  validationError: 'GRADES_VALIDATION_ERROR',
} as const;

type GradesErrorValue =
  (typeof gradesErrorCodes)[keyof typeof gradesErrorCodes];

export type GradesServiceError = GradesErrorValue;
