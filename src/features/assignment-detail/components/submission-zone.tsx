'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  AssignmentDetail,
  SubmissionDetail,
} from '@/features/assignment-detail/lib/dto';
import {
  submissionBodySchema,
  type SubmissionBody,
} from '@/features/assignment-detail/lib/dto';
import { useSubmitMutation } from '@/features/assignment-detail/hooks/useSubmitMutation';
import { useResubmitMutation } from '@/features/assignment-detail/hooks/useResubmitMutation';

type SubmissionZoneProps = {
  assignment: AssignmentDetail;
  submission: SubmissionDetail | null;
  courseId: string;
  assignmentId: string;
};

type SubmissionState =
  | 'active'
  | 'active_late'
  | 'active_resubmit'
  | 'already_submitted'
  | 'closed_deadline'
  | 'closed_status'
  | 'graded';

const resolveSubmissionState = (
  assignment: AssignmentDetail,
  submission: SubmissionDetail | null,
): SubmissionState => {
  if (submission?.status === 'graded') {
    return 'graded';
  }

  if (submission?.status === 'resubmission_required') {
    if (assignment.allowResubmission) return 'active_resubmit';
    return 'closed_deadline';
  }

  if (submission?.status === 'submitted') {
    return 'already_submitted';
  }

  if (assignment.status === 'closed') {
    return 'closed_status';
  }

  const isPastDeadline = new Date() >= new Date(assignment.dueDate);

  if (!isPastDeadline) {
    return 'active';
  }

  if (assignment.allowLate) {
    return 'active_late';
  }

  return 'closed_deadline';
};

const DisabledZone = ({ message }: { message: string }) => (
  <div className="flex items-center gap-2 rounded-md bg-muted p-4 text-sm text-muted-foreground">
    <Lock className="h-4 w-4 shrink-0" />
    <span>{message}</span>
  </div>
);

type SubmissionFormProps = {
  isResubmit: boolean;
  isLate: boolean;
  courseId: string;
  assignmentId: string;
};

const SubmissionForm = ({
  isResubmit,
  isLate,
  courseId,
  assignmentId,
}: SubmissionFormProps) => {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubmissionBody>({
    resolver: zodResolver(submissionBodySchema),
    defaultValues: { content: '', link: '' },
  });

  const submitMutation = useSubmitMutation(courseId, assignmentId);
  const resubmitMutation = useResubmitMutation(courseId, assignmentId);

  const activeMutation = isResubmit ? resubmitMutation : submitMutation;
  const isPending = activeMutation.isPending;

  const onSubmit = async (data: SubmissionBody) => {
    await activeMutation.mutateAsync(data);
    router.push(`/courses/my/${courseId}/assignments/${assignmentId}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {isLate && (
        <div className="flex items-center gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>마감일이 지났으나 지각 제출이 허용됩니다.</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="submission-content">제출 내용</Label>
        <Textarea
          id="submission-content"
          placeholder="과제 내용을 입력하세요."
          rows={6}
          {...register('content')}
          aria-invalid={Boolean(errors.content)}
        />
        {errors.content && (
          <p className="text-sm text-destructive">{errors.content.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="submission-link">
          참고 링크{' '}
          <span className="text-xs text-muted-foreground">(선택)</span>
        </Label>
        <Input
          id="submission-link"
          type="url"
          placeholder="https://..."
          {...register('link')}
          aria-invalid={Boolean(errors.link)}
        />
        {errors.link && (
          <p className="text-sm text-destructive">{errors.link.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full sm:w-auto"
      >
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isResubmit ? '재제출하기' : '제출하기'}
      </Button>
    </form>
  );
};

export const SubmissionZone = ({
  assignment,
  submission,
  courseId,
  assignmentId,
}: SubmissionZoneProps) => {
  const state = resolveSubmissionState(assignment, submission);

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="mb-4 text-sm font-semibold">과제 제출</h3>

        {state === 'active' && (
          <SubmissionForm
            isResubmit={false}
            isLate={false}
            courseId={courseId}
            assignmentId={assignmentId}
          />
        )}

        {state === 'active_late' && (
          <SubmissionForm
            isResubmit={false}
            isLate={true}
            courseId={courseId}
            assignmentId={assignmentId}
          />
        )}

        {state === 'active_resubmit' && (
          <SubmissionForm
            isResubmit={true}
            isLate={false}
            courseId={courseId}
            assignmentId={assignmentId}
          />
        )}

        {state === 'already_submitted' && (
          <DisabledZone message="이미 제출한 과제입니다." />
        )}

        {state === 'graded' && (
          <DisabledZone message="이미 채점이 완료된 과제입니다. 제출 및 재제출이 불가합니다." />
        )}

        {state === 'closed_deadline' && (
          <DisabledZone message="마감되었습니다. 지각 제출이 허용되지 않습니다." />
        )}

        {state === 'closed_status' && (
          <DisabledZone message="과제가 마감되었습니다." />
        )}
      </CardContent>
    </Card>
  );
};
