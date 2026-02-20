'use client';

import { RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useInstructorDashboardQuery } from '@/features/instructor-dashboard/hooks/useInstructorDashboardQuery';
import { MyCourseList } from './my-course-list';
import { RecentSubmissionTable } from './recent-submission-table';

const SectionSkeleton = () => (
  <div className="space-y-3">
    <div className="h-6 w-40 rounded bg-muted animate-pulse" />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="h-[160px] animate-pulse">
          <div className="p-6 space-y-3">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
            <div className="h-2 w-full rounded bg-muted" />
          </div>
        </Card>
      ))}
    </div>
  </div>
);

export const InstructorDashboardPage = () => {
  const { data, isLoading, isError, refetch } = useInstructorDashboardQuery();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <SectionSkeleton />
        <Separator />
        <SectionSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">오류가 발생했습니다</p>
        <p className="mb-4 text-sm">
          대시보드를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-1 h-4 w-4" />
          다시 시도
        </Button>
      </div>
    );
  }

  const totalPendingGradingCount = data?.totalPendingGradingCount ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">강의 현황</h2>
        {totalPendingGradingCount > 0 && (
          <Badge variant="destructive">
            채점 대기 {totalPendingGradingCount}건
          </Badge>
        )}
      </div>

      <section>
        <h2 className="mb-4 text-xl font-semibold">내 코스 목록</h2>
        <MyCourseList courses={data?.courses ?? []} />
      </section>

      <Separator />

      <section>
        <h2 className="mb-4 text-xl font-semibold">최근 제출물</h2>
        <RecentSubmissionTable submissions={data?.recentSubmissions ?? []} />
      </section>
    </div>
  );
};
