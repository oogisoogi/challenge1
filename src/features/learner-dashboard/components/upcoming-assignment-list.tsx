'use client';

import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { UpcomingAssignment } from '@/features/learner-dashboard/lib/dto';

type UpcomingAssignmentListProps = {
  assignments: UpcomingAssignment[];
};

const getDeadlineColor = (dueDate: string) => {
  const days = differenceInDays(new Date(dueDate), new Date());
  if (days <= 3) return 'text-red-600';
  if (days <= 7) return 'text-yellow-600';
  return 'text-muted-foreground';
};

const getStatusBadge = (status: UpcomingAssignment['submissionStatus']) => {
  if (!status) return null;

  const config = {
    submitted: { label: '제출됨', variant: 'secondary' as const },
    graded: { label: '채점완료', variant: 'default' as const },
    resubmission_required: { label: '재제출요청', variant: 'outline' as const },
  };

  const { label, variant } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
};

export const UpcomingAssignmentList = ({
  assignments,
}: UpcomingAssignmentListProps) => {
  if (assignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <ClipboardList className="mb-3 h-12 w-12" />
        <p className="text-lg font-medium">예정된 과제가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assignments.map((assignment) => (
        <Link
          key={assignment.id}
          href={`/courses/my/${assignment.courseId}/assignments/${assignment.id}`}
        >
          <Card className="p-4 transition-colors hover:bg-accent">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{assignment.title}</p>
                <p className="text-sm text-muted-foreground">
                  {assignment.courseTitle}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {getStatusBadge(assignment.submissionStatus)}
                <span
                  className={`text-sm font-medium ${getDeadlineColor(assignment.dueDate)}`}
                >
                  {formatDistanceToNow(new Date(assignment.dueDate), {
                    addSuffix: true,
                    locale: ko,
                  })}
                </span>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
};
