'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useReportsQuery } from '@/features/operator/hooks/useReportsQuery';
import {
  REPORT_STATUS_LABELS,
  REPORT_TARGET_TYPE_LABELS,
} from '@/features/operator/constants';
import { format } from 'date-fns';

type StatusFilter = 'all' | 'received' | 'investigating' | 'resolved';
type TargetTypeFilter = 'all' | 'course' | 'assignment' | 'submission' | 'user';

const statusVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  received: 'secondary',
  investigating: 'default',
  resolved: 'outline',
};

export const ReportsPage = () => {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState<TargetTypeFilter>('all');

  const filters = {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    targetType: targetTypeFilter !== 'all' ? targetTypeFilter : undefined,
  };

  const { data, isLoading, isError } = useReportsQuery(filters);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive p-6 text-destructive">
        신고 목록을 불러오는데 실패했습니다.
      </div>
    );
  }

  const reports = data?.reports ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1">
          {(['all', 'received', 'investigating', 'resolved'] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all' ? '전체' : REPORT_STATUS_LABELS[status]}
            </Button>
          ))}
        </div>

        <Select
          value={targetTypeFilter}
          onValueChange={(v) => setTargetTypeFilter(v as TargetTypeFilter)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="대상 유형" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 유형</SelectItem>
            {(Object.entries(REPORT_TARGET_TYPE_LABELS) as [string, string][]).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {reports.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          신고 내역이 없습니다.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>대상 유형</TableHead>
                <TableHead>사유</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>신고자</TableHead>
                <TableHead>접수일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow
                  key={report.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/operator/reports/${report.id}`)}
                >
                  <TableCell>
                    {REPORT_TARGET_TYPE_LABELS[report.targetType]}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {report.reason}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariantMap[report.status] ?? 'secondary'}>
                      {REPORT_STATUS_LABELS[report.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{report.reporterName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(report.createdAt), 'yyyy-MM-dd')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
