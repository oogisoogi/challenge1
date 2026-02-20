export const assignmentDetailErrorCodes = {
  // 기존 (변경 없음)
  unauthorized: 'ASSIGNMENT_DETAIL_UNAUTHORIZED',
  forbiddenRole: 'ASSIGNMENT_DETAIL_FORBIDDEN_ROLE',
  notEnrolled: 'ASSIGNMENT_DETAIL_NOT_ENROLLED',
  notFound: 'ASSIGNMENT_DETAIL_NOT_FOUND',
  fetchError: 'ASSIGNMENT_DETAIL_FETCH_ERROR',
  validationError: 'ASSIGNMENT_DETAIL_VALIDATION_ERROR',
  // 제출 관련 에러
  alreadySubmitted: 'ASSIGNMENT_SUBMISSION_ALREADY_SUBMITTED',
  lateNotAllowed: 'ASSIGNMENT_SUBMISSION_LATE_NOT_ALLOWED',
  assignmentClosed: 'ASSIGNMENT_SUBMISSION_CLOSED',
  resubmitNotAllowed: 'ASSIGNMENT_SUBMISSION_RESUBMIT_NOT_ALLOWED',
  notResubmitRequired: 'ASSIGNMENT_SUBMISSION_NOT_RESUBMIT_REQUIRED',
  submissionNotFound: 'ASSIGNMENT_SUBMISSION_NOT_FOUND',
} as const;

type AssignmentDetailErrorValue =
  (typeof assignmentDetailErrorCodes)[keyof typeof assignmentDetailErrorCodes];

export type AssignmentDetailServiceError = AssignmentDetailErrorValue;
