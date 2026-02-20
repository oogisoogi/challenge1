'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInstructorCoursesQuery } from '@/features/assignment-management/hooks/useInstructorCoursesQuery';
import { useAssignmentDetailQuery } from '@/features/assignment-management/hooks/useAssignmentDetailQuery';
import { useCreateAssignmentMutation } from '@/features/assignment-management/hooks/useCreateAssignmentMutation';
import { useUpdateAssignmentMutation } from '@/features/assignment-management/hooks/useUpdateAssignmentMutation';
import {
  createAssignmentBodySchema,
  type CreateAssignmentBody,
} from '@/features/assignment-management/lib/dto';

const createAssignmentFormSchema = createAssignmentBodySchema.refine(
  (data) => new Date(data.dueDate) > new Date(),
  { message: '마감일은 미래 날짜여야 합니다.', path: ['dueDate'] },
);

type AssignmentFormPageProps = {
  mode: 'create' | 'edit';
  assignmentId?: string;
};

const formatDatetimeLocal = (isoString: string): string => {
  const date = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const AssignmentFormPage = ({ mode, assignmentId }: AssignmentFormPageProps) => {
  const form = useForm<CreateAssignmentBody>({
    resolver: zodResolver(createAssignmentFormSchema),
    defaultValues: {
      courseId: '',
      title: '',
      description: '',
      dueDate: '',
      weight: 0,
      allowLate: false,
      allowResubmission: false,
    },
  });

  const { data: courses, isLoading: isCoursesLoading } = useInstructorCoursesQuery();

  const { data: assignmentDetail, isLoading: isDetailLoading } = useAssignmentDetailQuery(
    mode === 'edit' ? assignmentId : undefined,
  );

  const createMutation = useCreateAssignmentMutation();
  const updateMutation = useUpdateAssignmentMutation(assignmentId ?? '');

  const isSaving = mode === 'create' ? createMutation.isPending : updateMutation.isPending;

  useEffect(() => {
    if (mode === 'edit' && assignmentDetail) {
      form.reset({
        courseId: assignmentDetail.courseId,
        title: assignmentDetail.title,
        description: assignmentDetail.description,
        dueDate: formatDatetimeLocal(assignmentDetail.dueDate),
        weight: assignmentDetail.weight,
        allowLate: assignmentDetail.allowLate,
        allowResubmission: assignmentDetail.allowResubmission,
      });
    }
  }, [assignmentDetail, mode, form]);

  const onSubmit = (values: CreateAssignmentBody) => {
    if (mode === 'create') {
      createMutation.mutate({
        ...values,
        dueDate: new Date(values.dueDate).toISOString(),
      });
    } else {
      updateMutation.mutate({
        title: values.title,
        description: values.description,
        dueDate: new Date(values.dueDate).toISOString(),
        weight: values.weight,
        allowLate: values.allowLate,
        allowResubmission: values.allowResubmission,
      });
    }
  };

  const isLoading = mode === 'edit' && isDetailLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">
          {mode === 'create' ? '과제 생성' : '과제 수정'}
        </h1>
        <p className="text-muted-foreground">
          {mode === 'create'
            ? '새 과제 정보를 입력하세요.'
            : '과제 정보를 수정하세요.'}
        </p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="courseId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>대상 코스 *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={mode === 'edit'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isCoursesLoading
                            ? '코스 목록 로딩 중...'
                            : mode === 'edit'
                              ? assignmentDetail?.courseTitle
                              : '코스를 선택하세요'
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(courses ?? []).map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {mode === 'edit' && (
                  <FormDescription>코스는 과제 생성 후 변경할 수 없습니다.</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>과제 제목 *</FormLabel>
                <FormControl>
                  <Input placeholder="과제 제목을 입력하세요" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>과제 설명</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="과제 설명을 입력하세요. Markdown 형식을 지원합니다."
                    className="min-h-[120px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>마감일시 *</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>점수 비중 (0~100) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  동일 코스 내 과제들의 비중 합계가 100이 되도록 설정하세요.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="allowLate"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="cursor-pointer font-normal">
                      지각 제출 허용
                    </FormLabel>
                    <FormDescription>
                      마감일 이후에도 제출을 허용합니다. 지각 제출물에는 지각 표시가 됩니다.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allowResubmission"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel className="cursor-pointer font-normal">
                      재제출 허용
                    </FormLabel>
                    <FormDescription>
                      재제출 요청 상태의 제출물에 대해 학습자가 다시 제출할 수 있습니다.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              저장
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
