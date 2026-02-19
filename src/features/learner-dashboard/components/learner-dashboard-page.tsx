'use client';

import { RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLearnerDashboardQuery } from '@/features/learner-dashboard/hooks/useLearnerDashboardQuery';
import { EnrolledCourseList } from './enrolled-course-list';
import { UpcomingAssignmentList } from './upcoming-assignment-list';
import { RecentFeedbackList } from './recent-feedback-list';

const SkeletonSection = () => (
  <div className="space-y-3">
    <div className="h-6 w-40 animate-pulse rounded bg-muted" />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="h-[180px] animate-pulse">
          <div className="space-y-3 p-6">
            <div className="h-5 w-3/4 rounded bg-muted" />
            <div className="flex gap-1.5">
              <div className="h-5 w-16 rounded bg-muted" />
              <div className="h-5 w-12 rounded bg-muted" />
            </div>
            <div className="h-2 w-full rounded bg-muted" />
          </div>
        </Card>
      ))}
    </div>
  </div>
);

export const LearnerDashboardPage = () => {
  const { data, isLoading, isError, refetch } = useLearnerDashboardQuery();

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-5 w-72 animate-pulse rounded bg-muted" />
        </div>
        <SkeletonSection />
        <SkeletonSection />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 px-6 py-24">
        <p className="text-lg font-medium text-muted-foreground">
          대시보드를 불러오는데 실패했습니다
        </p>
        <p className="text-sm text-muted-foreground">
          잠시 후 다시 시도해주세요.
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          다시 시도
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">내 학습</h1>
        <p className="text-muted-foreground">
          수강 중인 코스와 과제, 피드백을 확인하세요.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">수강 중인 코스</h2>
        <EnrolledCourseList courses={data.courses} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">마감 임박 과제</h2>
        <UpcomingAssignmentList assignments={data.upcomingAssignments} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">최근 피드백</h2>
        <RecentFeedbackList feedback={data.recentFeedback} />
      </section>
    </div>
  );
};
