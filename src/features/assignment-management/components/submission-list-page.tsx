'use client';

import { useState } from 'react';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAssignmentSubmissionsQuery } from '@/features/assignment-management/hooks/useAssignmentSubmissionsQuery';
import { SubmissionFilterTabs } from './submission-filter-tabs';
import { AssignmentFormPage } from './assignment-form-page';
import { SubmissionGradingPanel } from './submission-grading-panel';
import { AssignmentStatusButton } from './assignment-status-button';
import type { SubmissionDetailItem } from '@/features/assignment-management/lib/dto';
import type { SubmissionFilter } from '@/features/assignment-management/constants';
import {
  ASSIGNMENT_STATUS_LABELS,
  ASSIGNMENT_STATUS_VARIANTS,
} from '@/features/assignment-management/constants';

type SubmissionListPageProps = {
  assignmentId: string;
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

const filterSubmissions = (
  submissions: SubmissionDetailItem[],
  filter: SubmissionFilter,
): SubmissionDetailItem[] => {
  if (filter === 'all') return submissions;
  if (filter === 'submitted') return submissions.filter((s) => s.status === 'submitted');
  if (filter === 'late') return submissions.filter((s) => s.isLate);
  if (filter === 'resubmission_required')
    return submissions.filter((s) => s.status === 'resubmission_required');
  return submissions;
};

const computeCounts = (
  submissions: SubmissionDetailItem[],
): Record<SubmissionFilter, number> => ({
  all: submissions.length,
  submitted: submissions.filter((s) => s.status === 'submitted').length,
  late: submissions.filter((s) => s.isLate).length,
  resubmission_required: submissions.filter((s) => s.status === 'resubmission_required')
    .length,
});

export const SubmissionListPage = ({ assignmentId }: SubmissionListPageProps) => {
  const [filter, setFilter] = useState<SubmissionFilter>('all');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionDetailItem | null>(null);

  const { data, isLoading, isError, error } = useAssignmentSubmissionsQuery(assignmentId, 'all');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-lg border border-destructive p-6 text-center text-destructive">
          {error instanceof Error
            ? error.message
            : '제출물 목록을 불러오는데 실패했습니다.'}
        </div>
      </div>
    );
  }

  const { assignment, submissions } = data;
  const filteredSubmissions = filterSubmissions(submissions, filter);
  const counts = computeCounts(submissions);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold">{assignment.title}</h1>
            <Badge variant={ASSIGNMENT_STATUS_VARIANTS[assignment.status]}>
              {ASSIGNMENT_STATUS_LABELS[assignment.status]}
            </Badge>
          </div>
          <AssignmentStatusButton
            assignmentId={assignmentId}
            currentStatus={assignment.status}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {assignment.courseTitle} &middot; 마감:{' '}
          {format(new Date(assignment.dueDate), 'yyyy. MM. dd. HH:mm', { locale: ko })}
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">과제 수정</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditOpen((prev) => !prev)}
            aria-expanded={isEditOpen}
          >
            {isEditOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CardHeader>
        {isEditOpen && (
          <CardContent className="pt-0">
            <AssignmentFormPage mode="edit" assignmentId={assignmentId} />
          </CardContent>
        )}
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">제출물 목록</h2>
          <span className="text-sm text-muted-foreground">총 {submissions.length}건</span>
        </div>

        <SubmissionFilterTabs
          currentFilter={filter}
          onFilterChange={setFilter}
          counts={counts}
        />

        <div className={`grid gap-6 ${selectedSubmission ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          <div>
            {filteredSubmissions.length === 0 ? (
              <div className="rounded-lg border p-12 text-center text-muted-foreground">
                {filter === 'all'
                  ? '아직 제출된 과제가 없습니다.'
                  : '해당 조건의 제출물이 없습니다.'}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>학습자</TableHead>
                      <TableHead>제출일시</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>지각</TableHead>
                      <TableHead className="text-right">점수</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubmissions.map((submission) => (
                      <TableRow
                        key={submission.id}
                        className={`cursor-pointer hover:bg-muted/50 ${
                          selectedSubmission?.id === submission.id ? 'bg-muted/50' : ''
                        }`}
                        onClick={() => setSelectedSubmission(submission)}
                      >
                        <TableCell className="font-medium">{submission.learnerName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(submission.submittedAt), 'yyyy. MM. dd. HH:mm', {
                            locale: ko,
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANTS[submission.status]}>
                            {STATUS_LABELS[submission.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {submission.isLate ? (
                            <Badge variant="destructive" className="text-xs">
                              지각
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {submission.score !== null ? (
                            <span>{submission.score}점</span>
                          ) : (
                            <span className="text-muted-foreground">미채점</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {selectedSubmission && (
            <SubmissionGradingPanel
              submission={selectedSubmission}
              assignmentId={assignmentId}
              onClose={() => setSelectedSubmission(null)}
            />
          )}
        </div>
      </section>
    </div>
  );
};
