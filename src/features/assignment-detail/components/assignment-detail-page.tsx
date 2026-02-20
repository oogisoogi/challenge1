'use client';

import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { isAxiosError } from '@/lib/remote/api-client';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAssignmentDetailQuery } from '@/features/assignment-detail/hooks/useAssignmentDetailQuery';
import { AssignmentMeta } from './assignment-meta';
import { AssignmentDescription } from './assignment-description';
import { SubmissionStatus } from './submission-status';
import { SubmissionZone } from './submission-zone';

type AssignmentDetailPageProps = {
  courseId: string;
  assignmentId: string;
};

const PageSkeleton = () => (
  <div className="animate-pulse space-y-6">
    <div className="h-8 w-2/3 rounded bg-muted" />
    <div className="h-32 rounded bg-muted" />
    <div className="space-y-2">
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-3/4 rounded bg-muted" />
    </div>
    <div className="h-40 rounded bg-muted" />
  </div>
);

const getErrorMessage = (error: unknown): string => {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 404) return '존재하지 않는 과제입니다.';
    if (status === 403) {
      const code = (error.response?.data as { error?: { code?: string } })
        ?.error?.code;
      if (code === 'ASSIGNMENT_DETAIL_NOT_ENROLLED') {
        return '수강 중인 코스가 아닙니다.';
      }
      return '접근 권한이 없습니다.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '과제를 불러오는데 실패했습니다.';
};

export const AssignmentDetailPage = ({
  courseId,
  assignmentId,
}: AssignmentDetailPageProps) => {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useAssignmentDetailQuery(courseId, assignmentId);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (isError) {
    const message = getErrorMessage(error);

    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">{message}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => refetch()}
        >
          <RefreshCw className="mr-1 h-4 w-4" />
          다시 시도
        </Button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { assignment, submission } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/courses/my">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            내 학습
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{assignment.title}</h1>
      </div>

      <AssignmentMeta assignment={assignment} />

      <Separator />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">과제 설명</h2>
        <AssignmentDescription description={assignment.description} />
      </section>

      <Separator />

      <SubmissionStatus submission={submission} />

      <SubmissionZone
        assignment={assignment}
        submission={submission}
        courseId={courseId}
        assignmentId={assignmentId}
      />
    </div>
  );
};
