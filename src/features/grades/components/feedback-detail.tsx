'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type {
  FeedbackAssignment,
  FeedbackSubmission,
} from '@/features/grades/lib/dto';

type FeedbackDetailProps = {
  courseId: string;
  assignmentId: string;
  assignment: FeedbackAssignment;
  submission: FeedbackSubmission;
};

const SUBMISSION_STATUS_CONFIG = {
  submitted: { label: '채점 대기', variant: 'outline' as const },
  graded: { label: '채점완료', variant: 'default' as const },
  resubmission_required: { label: '재제출요청', variant: 'outline' as const },
} as const;

const SubmissionStatusBadge = ({
  status,
}: {
  status: FeedbackSubmission['status'];
}) => {
  const config = SUBMISSION_STATUS_CONFIG[status];

  if (status === 'resubmission_required') {
    return (
      <Badge
        variant="outline"
        className="bg-orange-100 text-orange-800 border-orange-200"
      >
        {config.label}
      </Badge>
    );
  }

  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export const FeedbackDetail = ({
  courseId,
  assignmentId,
  assignment,
  submission,
}: FeedbackDetailProps) => {
  const showResubmitButton =
    submission.status === 'resubmission_required' &&
    assignment.allowResubmission;

  return (
    <div className="space-y-6">
      {/* 제출 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">제출 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <SubmissionStatusBadge status={submission.status} />
            {submission.isLate && (
              <Badge variant="destructive">지각</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            제출 일시:{' '}
            {format(new Date(submission.submittedAt), 'yyyy.MM.dd HH:mm')}
          </p>
        </CardContent>
      </Card>

      {/* 내 제출 내용 */}
      <section className="space-y-2">
        <h3 className="text-base font-semibold">내 제출 내용</h3>
        <p className="whitespace-pre-wrap rounded-md bg-muted p-4 text-sm">
          {submission.content}
        </p>
        {submission.link && (
          <a
            href={submission.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            참고 링크
          </a>
        )}
      </section>

      <Separator />

      {/* Instructor 피드백 */}
      {submission.feedback !== null ? (
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Instructor 피드백</h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            {submission.score !== null && (
              <p className="text-2xl font-bold text-blue-700">
                {submission.score}/100점
              </p>
            )}
            <p className="whitespace-pre-wrap text-sm">{submission.feedback}</p>
            {submission.gradedAt && (
              <p className="text-xs text-muted-foreground">
                채점 일시:{' '}
                {format(new Date(submission.gradedAt), 'yyyy.MM.dd HH:mm')}
              </p>
            )}
          </div>
        </section>
      ) : (
        <section>
          <p className="text-sm text-muted-foreground">
            아직 피드백이 없습니다
          </p>
        </section>
      )}

      {/* 재제출 버튼 */}
      {showResubmitButton && (
        <div className="pt-2">
          <Link
            href={`/courses/my/${courseId}/assignments/${assignmentId}`}
          >
            <Button variant="default">재제출하기</Button>
          </Link>
        </div>
      )}
    </div>
  );
};
