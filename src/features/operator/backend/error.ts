export const operatorErrorCodes = {
  unauthorized: 'OPERATOR_UNAUTHORIZED',
  forbiddenRole: 'OPERATOR_FORBIDDEN_ROLE',
  notFound: 'OPERATOR_NOT_FOUND',
  validationError: 'OPERATOR_VALIDATION_ERROR',
  invalidStatusTransition: 'OPERATOR_INVALID_STATUS_TRANSITION',
  actionRequired: 'OPERATOR_ACTION_REQUIRED',
  invalidAction: 'OPERATOR_INVALID_ACTION',
  duplicateName: 'OPERATOR_DUPLICATE_NAME',
  fetchError: 'OPERATOR_FETCH_ERROR',
  updateFailed: 'OPERATOR_UPDATE_FAILED',
} as const;

type OperatorErrorValue =
  (typeof operatorErrorCodes)[keyof typeof operatorErrorCodes];

export type OperatorServiceError = OperatorErrorValue;
