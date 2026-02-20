'use client';

import { InstructorDashboardPage } from '@/features/instructor-dashboard/components/instructor-dashboard-page';

type InstructorDashboardPageProps = {
  params: Promise<Record<string, never>>;
};

export default function InstructorDashboard({
  params,
}: InstructorDashboardPageProps) {
  void params;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Instructor 대시보드</h1>
        <p className="text-muted-foreground">
          내 코스와 최근 제출물을 한눈에 확인하세요.
        </p>
      </header>
      <InstructorDashboardPage />
    </div>
  );
}
