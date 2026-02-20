export const assignmentManagementErrorCodes = {
  unauthorized: 'ASSIGNMENT_MGMT_UNAUTHORIZED',
  forbiddenRole: 'ASSIGNMENT_MGMT_FORBIDDEN_ROLE',
  forbidden: 'ASSIGNMENT_MGMT_FORBIDDEN',
  notFound: 'ASSIGNMENT_MGMT_NOT_FOUND',
  validationError: 'ASSIGNMENT_MGMT_VALIDATION_ERROR',
  pastDueDate: 'ASSIGNMENT_MGMT_PAST_DUE_DATE',
  courseIdImmutable: 'ASSIGNMENT_MGMT_COURSE_ID_IMMUTABLE',
  createFailed: 'ASSIGNMENT_MGMT_CREATE_FAILED',
  updateFailed: 'ASSIGNMENT_MGMT_UPDATE_FAILED',
  fetchError: 'ASSIGNMENT_MGMT_FETCH_ERROR',
  gradeFailed: 'ASSIGNMENT_MGMT_GRADE_FAILED',
  submissionNotFound: 'ASSIGNMENT_MGMT_SUBMISSION_NOT_FOUND',
  invalidStatusTransition: 'ASSIGNMENT_MGMT_INVALID_STATUS_TRANSITION',
  courseNotPublished: 'ASSIGNMENT_MGMT_COURSE_NOT_PUBLISHED',
  missingTitle: 'ASSIGNMENT_MGMT_MISSING_TITLE',
  pastDueDateOnPublish: 'ASSIGNMENT_MGMT_PAST_DUE_DATE_ON_PUBLISH',
} as const;

type AssignmentManagementErrorValue =
  (typeof assignmentManagementErrorCodes)[keyof typeof assignmentManagementErrorCodes];

export type AssignmentManagementServiceError = AssignmentManagementErrorValue;
