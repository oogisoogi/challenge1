'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReportDetailQuery } from '@/features/operator/hooks/useReportDetailQuery';
import { useUpdateReportMutation } from '@/features/operator/hooks/useUpdateReportMutation';
import {
  REPORT_STATUS_LABELS,
  REPORT_TARGET_TYPE_LABELS,
  REPORT_ACTION_LABELS,
  ACTION_ALLOWED_TARGET_TYPES,
} from '@/features/operator/constants';
import { format } from 'date-fns';
import type { Report } from '@/features/operator/lib/dto';

type ReportDetailPageProps = {
  reportId: string;
};

type ReportAction = 'warning' | 'invalidate_submission' | 'restrict_account';

const statusVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  received: 'secondary',
  investigating: 'default',
  resolved: 'outline',
};

const getAvailableActions = (targetType: Report['targetType']): ReportAction[] =>
  (Object.keys(ACTION_ALLOWED_TARGET_TYPES) as ReportAction[]).filter((action) =>
    (ACTION_ALLOWED_TARGET_TYPES[action] as readonly string[]).includes(targetType),
  );

const ReportInfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-4">
    <span className="min-w-[100px] text-sm font-medium text-muted-foreground">{label}</span>
    <span className="text-sm">{value}</span>
  </div>
);

export const ReportDetailPage = ({ reportId }: ReportDetailPageProps) => {
  const router = useRouter();
  const [selectedAction, setSelectedAction] = useState<ReportAction | ''>('');

  const { data, isLoading, isError } = useReportDetailQuery(reportId);
  const updateMutation = useUpdateReportMutation();

  const handleStartInvestigation = () => {
    updateMutation.mutate({ reportId, body: { status: 'investigating' } });
  };

  const handleResolve = () => {
    if (!selectedAction) return;
    updateMutation.mutate({
      reportId,
      body: { status: 'resolved', action: selectedAction },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-destructive p-6 text-destructive">
        신고를 찾을 수 없습니다.
      </div>
    );
  }

  const { report } = data;
  const availableActions = getAvailableActions(report.targetType);

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/operator/reports')}
        className="gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        신고 목록으로
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>신고 정보</CardTitle>
          <Badge variant={statusVariantMap[report.status] ?? 'secondary'}>
            {REPORT_STATUS_LABELS[report.status]}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReportInfoRow label="신고자" value={report.reporterName} />
          <ReportInfoRow
            label="대상 유형"
            value={REPORT_TARGET_TYPE_LABELS[report.targetType]}
          />
          <ReportInfoRow label="대상 ID" value={report.targetId} />
          <ReportInfoRow label="사유" value={report.reason} />
          <ReportInfoRow
            label="상세 내용"
            value={report.content || <span className="text-muted-foreground">없음</span>}
          />
          <ReportInfoRow
            label="접수일"
            value={format(new Date(report.createdAt), 'yyyy-MM-dd HH:mm')}
          />
          <ReportInfoRow
            label="최종 수정"
            value={format(new Date(report.updatedAt), 'yyyy-MM-dd HH:mm')}
          />
          {report.action && (
            <ReportInfoRow
              label="처리 액션"
              value={REPORT_ACTION_LABELS[report.action]}
            />
          )}
        </CardContent>
      </Card>

      {report.status !== 'resolved' && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle>신고 처리</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {report.status === 'received' && (
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    이 신고를 조사 중으로 전환합니다.
                  </p>
                  <Button
                    onClick={handleStartInvestigation}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    조사 시작
                  </Button>
                </div>
              )}

              {report.status === 'investigating' && (
                <div className="space-y-4">
                  <div className="flex items-end gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-sm font-medium">처리 액션 선택</label>
                      <Select
                        value={selectedAction}
                        onValueChange={(v) => setSelectedAction(v as ReportAction)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="액션을 선택하세요" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableActions.map((action) => (
                            <SelectItem key={action} value={action}>
                              {REPORT_ACTION_LABELS[action]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleResolve}
                      disabled={!selectedAction || updateMutation.isPending}
                    >
                      {updateMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      처리 완료
                    </Button>
                  </div>
                  {!selectedAction && (
                    <p className="text-sm text-muted-foreground">
                      처리 액션을 선택해야 처리 완료가 가능합니다.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {report.status === 'resolved' && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              이 신고는 처리 완료 상태입니다.
              {report.action && (
                <> 적용된 액션: <strong>{REPORT_ACTION_LABELS[report.action]}</strong></>
              )}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
