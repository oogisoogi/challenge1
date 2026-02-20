'use client';

import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { SubmissionDetail } from '@/features/assignment-detail/lib/dto';

type SubmissionStatusProps = {
  submission: SubmissionDetail | null;
};

const STATUS_CONFIG = {
  submitted: {
    label: '제출됨',
    variant: 'secondary' as const,
  },
  graded: {
    label: '채점완료',
    variant: 'default' as const,
  },
  resubmission_required: {
    label: '재제출요청',
    variant: 'outline' as const,
  },
} as const;

const NoSubmission = () => (
  <p className="text-sm text-muted-foreground">아직 제출하지 않았습니다.</p>
);

const SubmissionInfo = ({ submission }: { submission: SubmissionDetail }) => {
  const config = STATUS_CONFIG[submission.status];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={config.variant}>{config.label}</Badge>
        {submission.isLate && (
          <Badge variant="destructive">지각</Badge>
        )}
      </div>

      <div className="space-y-1 text-sm text-muted-foreground">
        <p>
          제출일시:{' '}
          {format(new Date(submission.submittedAt), 'yyyy.MM.dd HH:mm')}
        </p>

        {submission.status === 'graded' && submission.score !== null && (
          <p className="font-semibold text-foreground">
            점수: {submission.score}/100점
          </p>
        )}

        {submission.gradedAt && (
          <p>
            채점일시:{' '}
            {format(new Date(submission.gradedAt), 'yyyy.MM.dd HH:mm')}
          </p>
        )}

        {submission.feedback && (
          <div className="mt-2 rounded-md bg-muted p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              피드백
            </p>
            <p className="whitespace-pre-wrap text-foreground">
              {submission.feedback}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export const SubmissionStatus = ({ submission }: SubmissionStatusProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="mb-3 text-sm font-semibold">제출 현황</h3>
        {submission ? (
          <SubmissionInfo submission={submission} />
        ) : (
          <NoSubmission />
        )}
      </CardContent>
    </Card>
  );
};
