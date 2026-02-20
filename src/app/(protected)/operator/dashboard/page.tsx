'use client';

import { OperatorDashboardPage } from '@/features/operator/components/operator-dashboard-page';

type OperatorDashboardPageProps = {
  params: Promise<Record<string, never>>;
};

export default function OperatorDashboard({ params }: OperatorDashboardPageProps) {
  void params;
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">운영 대시보드</h1>
        <p className="text-muted-foreground">운영 현황을 한눈에 확인하세요.</p>
      </header>
      <OperatorDashboardPage />
    </div>
  );
}
