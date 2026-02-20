'use client';

import { format, differenceInHours } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { AssignmentDetail } from '@/features/assignment-detail/lib/dto';

type AssignmentMetaProps = {
  assignment: AssignmentDetail;
};

const getDueDateBadge = (dueDate: string) => {
  const now = new Date();
  const due = new Date(dueDate);
  const hoursLeft = differenceInHours(due, now);

  if (hoursLeft < 0) {
    return <Badge variant="secondary">마감됨</Badge>;
  }

  if (hoursLeft <= 24) {
    return <Badge variant="destructive">마감 임박</Badge>;
  }

  return null;
};

const getStatusBadge = (status: AssignmentDetail['status']) => {
  if (status === 'published') {
    return <Badge variant="default">진행중</Badge>;
  }
  return <Badge variant="secondary">마감</Badge>;
};

const getPolicyBadge = (allowed: boolean) => {
  if (allowed) {
    return <Badge variant="secondary">허용</Badge>;
  }
  return <Badge variant="outline">불허</Badge>;
};

export const AssignmentMeta = ({ assignment }: AssignmentMetaProps) => {
  const dueDateBadge = getDueDateBadge(assignment.dueDate);

  return (
    <Card>
      <CardContent className="pt-6">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
          <div className="space-y-1">
            <dt className="text-sm font-medium text-muted-foreground">마감일</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">
                {format(new Date(assignment.dueDate), 'yyyy.MM.dd HH:mm')}
              </span>
              {dueDateBadge}
            </dd>
          </div>

          <div className="space-y-1">
            <dt className="text-sm font-medium text-muted-foreground">점수 비중</dt>
            <dd className="text-sm font-semibold">{assignment.weight}점</dd>
          </div>

          <div className="space-y-1">
            <dt className="text-sm font-medium text-muted-foreground">지각 제출</dt>
            <dd>{getPolicyBadge(assignment.allowLate)}</dd>
          </div>

          <div className="space-y-1">
            <dt className="text-sm font-medium text-muted-foreground">재제출</dt>
            <dd>{getPolicyBadge(assignment.allowResubmission)}</dd>
          </div>

          <div className="space-y-1">
            <dt className="text-sm font-medium text-muted-foreground">과제 상태</dt>
            <dd>{getStatusBadge(assignment.status)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
};
