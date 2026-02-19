'use client';

import { LearnerDashboardPage } from '@/features/learner-dashboard/components/learner-dashboard-page';

type CoursesMyPageProps = {
  params: Promise<Record<string, never>>;
};

export default function CoursesMyPage({ params }: CoursesMyPageProps) {
  void params;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">내 학습</h1>
        <p className="mt-1 text-muted-foreground">
          수강 중인 코스와 과제, 피드백을 확인하세요.
        </p>
      </div>
      <LearnerDashboardPage />
    </div>
  );
}
