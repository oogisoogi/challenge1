'use client';

import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { isAxiosError } from '@/lib/remote/api-client';
import { useCourseGradesQuery } from '@/features/grades/hooks/useCourseGradesQuery';
import { GradesSummaryCard } from './grades-summary-card';
import { GradesTable } from './grades-table';

type GradesPageProps = {
  courseId: string;
};

const PageSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-4">
      <Skeleton className="h-9 w-24" />
      <Skeleton className="h-8 w-48" />
    </div>
    <Skeleton className="h-28 w-full rounded-lg" />
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  </div>
);

const getErrorMessage = (error: unknown): string => {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const code = (error.response?.data as { error?: { code?: string } })
      ?.error?.code;

    if (status === 403 && code === 'GRADES_NOT_ENROLLED') {
      return '수강 중인 코스가 아닙니다.';
    }
    if (status === 403) {
      return '접근 권한이 없습니다.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '성적 정보를 불러오는데 실패했습니다.';
};

export const GradesPage = ({ courseId }: GradesPageProps) => {
  const { data, isLoading, isError, error, refetch } =
    useCourseGradesQuery(courseId);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/courses/my">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            내 학습
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{data.courseTitle} — 성적</h1>
      </div>

      <GradesSummaryCard totalScore={data.totalScore} />

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">과제별 성적</h2>
        <GradesTable courseId={courseId} assignments={data.assignments} />
      </section>
    </div>
  );
};
