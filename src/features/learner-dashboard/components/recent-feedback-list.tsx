'use client';

import { MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { RecentFeedback } from '@/features/learner-dashboard/lib/dto';

type RecentFeedbackListProps = {
  feedback: RecentFeedback[];
};

const getStatusBadge = (status: RecentFeedback['status']) => {
  const config = {
    submitted: { label: '제출됨', className: 'bg-blue-100 text-blue-800' },
    graded: { label: '채점완료', className: 'bg-green-100 text-green-800' },
    resubmission_required: {
      label: '재제출요청',
      className: 'bg-orange-100 text-orange-800',
    },
  };

  const { label, className } = config[status];
  return (
    <Badge variant="secondary" className={className}>
      {label}
    </Badge>
  );
};

export const RecentFeedbackList = ({ feedback }: RecentFeedbackListProps) => {
  if (feedback.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <MessageSquare className="mb-3 h-12 w-12" />
        <p className="text-lg font-medium">아직 피드백이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {feedback.map((item) => (
        <Card key={item.submissionId}>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.assignmentTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {item.courseTitle}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {item.score !== null && (
                  <span className="text-sm font-semibold">{item.score}점</span>
                )}
                {getStatusBadge(item.status)}
              </div>
            </div>
            {item.feedback && (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {item.feedback}
              </p>
            )}
            {item.gradedAt && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(item.gradedAt), 'yyyy.MM.dd HH:mm')}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
