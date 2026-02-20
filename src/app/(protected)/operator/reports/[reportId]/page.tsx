'use client';

import { use } from 'react';
import { ReportDetailPage } from '@/features/operator/components/report-detail-page';

type OperatorReportDetailPageProps = {
  params: Promise<{ reportId: string }>;
};

export default function OperatorReportDetail({ params }: OperatorReportDetailPageProps) {
  const { reportId } = use(params);
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">신고 상세</h1>
      </header>
      <ReportDetailPage reportId={reportId} />
    </div>
  );
}
