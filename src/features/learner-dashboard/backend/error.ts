export const dashboardErrorCodes = {
  unauthorized: 'DASHBOARD_UNAUTHORIZED',
  forbiddenRole: 'DASHBOARD_FORBIDDEN_ROLE',
  fetchError: 'DASHBOARD_FETCH_ERROR',
} as const;

type DashboardErrorValue =
  (typeof dashboardErrorCodes)[keyof typeof dashboardErrorCodes];

export type DashboardServiceError = DashboardErrorValue;
