'use client';

import Link from 'next/link';
import { BarChart2, AlertCircle, BookOpen, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useOperatorDashboardQuery } from '@/features/operator/hooks/useOperatorDashboardQuery';

const StatCard = ({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
    </CardContent>
  </Card>
);

const StatCardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-4" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-16" />
    </CardContent>
  </Card>
);

export const OperatorDashboardPage = () => {
  const { data, isLoading, isError } = useOperatorDashboardQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-destructive p-6 text-destructive">
        대시보드를 불러오는데 실패했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="미처리 신고"
          value={data.receivedReportCount}
          icon={AlertCircle}
        />
        <StatCard
          title="조사 중 신고"
          value={data.investigatingReportCount}
          icon={BarChart2}
        />
        <StatCard
          title="전체 코스"
          value={data.totalCourseCount}
          icon={BookOpen}
        />
        <StatCard
          title="전체 사용자"
          value={data.totalUserCount}
          icon={Users}
        />
      </div>

      <div className="flex gap-4">
        <Button asChild>
          <Link href="/operator/reports">신고 관리</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/operator/metadata">메타데이터 관리</Link>
        </Button>
      </div>
    </div>
  );
};
