'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Loader2, X, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useGradeSubmissionMutation } from '@/features/assignment-management/hooks/useGradeSubmissionMutation';
import type { SubmissionDetailItem } from '@/features/assignment-management/lib/dto';

type SubmissionGradingPanelProps = {
  submission: SubmissionDetailItem;
  assignmentId: string;
  onClose: () => void;
};

const STATUS_LABELS: Record<SubmissionDetailItem['status'], string> = {
  submitted: '제출됨',
  graded: '채점 완료',
  resubmission_required: '재제출 요청',
};

const STATUS_VARIANTS: Record<
  SubmissionDetailItem['status'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  submitted: 'outline',
  graded: 'secondary',
  resubmission_required: 'destructive',
};

const gradingFormSchema = z.object({
  score: z
    .number({ invalid_type_error: '점수를 입력해주세요.' })
    .int('점수는 정수여야 합니다.')
    .min(0, '점수는 0 이상이어야 합니다.')
    .max(100, '점수는 100 이하여야 합니다.')
    .nullable(),
  feedback: z.string().min(1, '피드백을 입력해주세요.'),
});

type GradingFormValues = z.infer<typeof gradingFormSchema>;

export const SubmissionGradingPanel = ({
  submission,
  assignmentId,
  onClose,
}: SubmissionGradingPanelProps) => {
  const { mutate, isPending } = useGradeSubmissionMutation();

  const form = useForm<GradingFormValues>({
    resolver: zodResolver(gradingFormSchema),
    defaultValues: {
      score: submission.score ?? null,
      feedback: submission.feedback ?? '',
    },
  });

  const feedbackValue = form.watch('feedback');
  const scoreValue = form.watch('score');

  const isGradeButtonDisabled =
    isPending ||
    !feedbackValue ||
    feedbackValue.trim().length === 0 ||
    scoreValue === null ||
    scoreValue === undefined;

  const isResubmissionButtonDisabled =
    isPending || !feedbackValue || feedbackValue.trim().length === 0;

  const handleGrade = () => {
    form.trigger(['score', 'feedback']).then((valid) => {
      if (!valid) return;
      const values = form.getValues();
      if (values.score === null || values.score === undefined) return;
      mutate({
        submissionId: submission.id,
        assignmentId,
        body: {
          action: 'grade',
          score: values.score,
          feedback: values.feedback,
        },
      });
    });
  };

  const handleResubmission = () => {
    form.trigger('feedback').then((valid) => {
      if (!valid) return;
      const values = form.getValues();
      mutate({
        submissionId: submission.id,
        assignmentId,
        body: {
          action: 'resubmission',
          feedback: values.feedback,
        },
      });
    });
  };

  return (
    <Card className="h-fit">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold">제출물 채점</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
          aria-label="채점 패널 닫기"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* 제출자 정보 */}
        <section className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{submission.learnerName}</span>
            <Badge variant={STATUS_VARIANTS[submission.status]}>
              {STATUS_LABELS[submission.status]}
            </Badge>
            {submission.isLate && (
              <Badge variant="destructive" className="text-xs">
                지각
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            제출 시각:{' '}
            {format(new Date(submission.submittedAt), 'yyyy. MM. dd. HH:mm', { locale: ko })}
          </p>
        </section>

        <Separator />

        {/* 제출 내용 */}
        <section className="space-y-2">
          <h3 className="text-sm font-medium">제출 내용</h3>
          <div className="rounded-md bg-muted px-3 py-2 text-sm whitespace-pre-wrap min-h-[80px]">
            {submission.content}
          </div>
          {submission.link && (
            <a
              href={submission.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              제출 링크
            </a>
          )}
        </section>

        {/* 이전 채점 정보 */}
        {(submission.status === 'graded' || submission.feedback) && (
          <>
            <Separator />
            <section className="space-y-1">
              <h3 className="text-sm font-medium">이전 채점 정보</h3>
              {submission.score !== null && (
                <p className="text-sm">
                  점수: <span className="font-semibold">{submission.score}점</span>
                </p>
              )}
            </section>
          </>
        )}

        <Separator />

        {/* 채점 폼 */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium">채점</h3>
          <Form {...form}>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>점수 (0~100)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        placeholder="점수 입력"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? null : Number(val));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="feedback"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>피드백 (필수)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="피드백을 입력해주세요."
                        className="min-h-[100px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  className="flex-1"
                  disabled={isGradeButtonDisabled}
                  onClick={handleGrade}
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  채점 완료
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  disabled={isResubmissionButtonDisabled}
                  onClick={handleResubmission}
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  재제출 요청
                </Button>
              </div>
            </div>
          </Form>
        </section>
      </CardContent>
    </Card>
  );
};
