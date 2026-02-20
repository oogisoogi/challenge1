export const courseManagementErrorCodes = {
  unauthorized: 'COURSE_MGMT_UNAUTHORIZED',
  forbiddenRole: 'COURSE_MGMT_FORBIDDEN_ROLE',
  forbidden: 'COURSE_MGMT_FORBIDDEN',
  notFound: 'COURSE_MGMT_NOT_FOUND',
  validationError: 'COURSE_MGMT_VALIDATION_ERROR',
  invalidCategory: 'COURSE_MGMT_INVALID_CATEGORY',
  invalidDifficulty: 'COURSE_MGMT_INVALID_DIFFICULTY',
  invalidStatusTransition: 'COURSE_MGMT_INVALID_STATUS_TRANSITION',
  createFailed: 'COURSE_MGMT_CREATE_FAILED',
  updateFailed: 'COURSE_MGMT_UPDATE_FAILED',
  fetchError: 'COURSE_MGMT_FETCH_ERROR',
} as const;

type CourseManagementErrorValue =
  (typeof courseManagementErrorCodes)[keyof typeof courseManagementErrorCodes];

export type CourseManagementServiceError = CourseManagementErrorValue;
