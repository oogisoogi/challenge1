'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { assignmentSubmissionsResponseSchema } from '@/features/assignment-management/lib/dto';
import { ASSIGNMENT_MANAGEMENT_QUERY_KEYS } from '@/features/assignment-management/constants';
import type { SubmissionFilter } from '@/features/assignment-management/constants';

const fetchAssignmentSubmissions = async (
  assignmentId: string,
  filter: SubmissionFilter,
) => {
  try {
    const { data } = await apiClient.get(
      `/api/instructor/assignments/${assignmentId}/submissions?filter=${filter}`,
    );
    return assignmentSubmissionsResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '제출물 목록을 불러오는데 실패했습니다.');
    throw new Error(message);
  }
};

export const useAssignmentSubmissionsQuery = (
  assignmentId: string | undefined,
  filter: SubmissionFilter = 'all',
) =>
  useQuery({
    queryKey: ASSIGNMENT_MANAGEMENT_QUERY_KEYS.submissions(assignmentId ?? '', filter),
    queryFn: () => fetchAssignmentSubmissions(assignmentId!, filter),
    staleTime: 0,
    enabled: Boolean(assignmentId),
  });
