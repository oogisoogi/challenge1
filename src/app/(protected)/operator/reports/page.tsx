'use client';

import { ReportsPage } from '@/features/operator/components/reports-page';

type OperatorReportsPageProps = {
  params: Promise<Record<string, never>>;
};

export default function OperatorReports({ params }: OperatorReportsPageProps) {
  void params;
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">신고 관리</h1>
        <p className="text-muted-foreground">접수된 신고를 처리하세요.</p>
      </header>
      <ReportsPage />
    </div>
  );
}
