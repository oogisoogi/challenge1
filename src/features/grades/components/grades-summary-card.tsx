'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type GradesSummaryCardProps = {
  totalScore: number | null;
};

export const GradesSummaryCard = ({ totalScore }: GradesSummaryCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">코스 총점</CardTitle>
      </CardHeader>
      <CardContent>
        {totalScore !== null ? (
          <p className="text-3xl font-bold text-foreground">
            {totalScore.toFixed(1)}점
          </p>
        ) : (
          <div className="space-y-1">
            <p className="text-3xl font-bold text-muted-foreground">N/A</p>
            <p className="text-sm text-muted-foreground">
              채점 완료된 과제가 없습니다
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
