export const instructorDashboardErrorCodes = {
  unauthorized: 'INSTRUCTOR_DASHBOARD_UNAUTHORIZED',
  forbiddenRole: 'INSTRUCTOR_DASHBOARD_FORBIDDEN_ROLE',
  fetchError: 'INSTRUCTOR_DASHBOARD_FETCH_ERROR',
} as const;

type InstructorDashboardErrorValue =
  (typeof instructorDashboardErrorCodes)[keyof typeof instructorDashboardErrorCodes];

export type InstructorDashboardServiceError = InstructorDashboardErrorValue;
