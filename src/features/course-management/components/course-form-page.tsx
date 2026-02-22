'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Info, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useCourseMetaQuery } from '@/features/course/hooks/useCourseMetaQuery';
import { useCourseManagementDetailQuery } from '@/features/course-management/hooks/useCourseManagementDetailQuery';
import { useCreateCourseMutation } from '@/features/course-management/hooks/useCreateCourseMutation';
import { useUpdateCourseMutation } from '@/features/course-management/hooks/useUpdateCourseMutation';
import { useCreateCategoryMutation } from '@/features/course-management/hooks/useCreateCategoryMutation';
import {
  createCourseBodySchema,
  type CreateCourseBody,
} from '@/features/course-management/lib/dto';
import { CourseStatusButton } from './course-status-button';

type CourseFormPageProps = {
  mode: 'create' | 'edit';
  courseId?: string;
};

export const CourseFormPage = ({ mode, courseId }: CourseFormPageProps) => {
  const form = useForm<CreateCourseBody>({
    resolver: zodResolver(createCourseBodySchema),
    defaultValues: {
      title: '',
      description: '',
      categoryId: '',
      difficultyId: '',
      curriculum: '',
    },
  });

  const { data: courseMeta, isLoading: isMetaLoading } = useCourseMetaQuery();

  const { data: courseDetail, isLoading: isDetailLoading } =
    useCourseManagementDetailQuery(mode === 'edit' ? courseId : undefined);

  const createMutation = useCreateCourseMutation();
  const updateMutation = useUpdateCourseMutation(courseId ?? '');
  const createCategoryMutation = useCreateCategoryMutation();

  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const isSaving =
    mode === 'create' ? createMutation.isPending : updateMutation.isPending;

  useEffect(() => {
    if (mode === 'edit' && courseDetail) {
      form.reset({
        title: courseDetail.title,
        description: courseDetail.description,
        categoryId: courseDetail.categoryId ?? '',
        difficultyId: courseDetail.difficultyId ?? '',
        curriculum: courseDetail.curriculum,
      });
    }
  }, [courseDetail, mode, form]);

  const onSubmit = (values: CreateCourseBody) => {
    if (mode === 'create') {
      createMutation.mutate(values);
    } else {
      updateMutation.mutate(values);
    }
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    createCategoryMutation.mutate(trimmed, {
      onSuccess: (created) => {
        form.setValue('categoryId', created.id);
        setNewCategoryName('');
        setIsAddCategoryOpen(false);
      },
    });
  };

  const isLoading = (mode === 'edit' && isDetailLoading) || isMetaLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12">
      <Link href="/instructor/dashboard">
        <Button variant="ghost" size="sm" type="button">
          <ArrowLeft className="mr-1 h-4 w-4" />
          대시보드
        </Button>
      </Link>

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">
          {mode === 'create' ? '코스 생성' : '코스 수정'}
        </h1>
        <p className="text-muted-foreground">
          {mode === 'create'
            ? '새 코스 정보를 입력하세요.'
            : '코스 정보를 수정하세요.'}
        </p>
      </header>

      {mode === 'edit' && courseDetail && courseDetail.status === 'draft' && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
          <Info className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex flex-1 items-center justify-between gap-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              이 코스는 아직 <strong>초안</strong> 상태입니다. 게시해야 학습자에게 노출됩니다.
            </p>
            <CourseStatusButton
              courseId={courseDetail.id}
              currentStatus={courseDetail.status}
            />
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>코스 제목 *</FormLabel>
                <FormControl>
                  <Input placeholder="코스 제목을 입력하세요" {...field} />
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
                <FormLabel>코스 소개</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="코스 소개를 입력하세요. Markdown 형식을 지원합니다."
                    className="min-h-[120px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>카테고리 *</FormLabel>
                  <div className="flex gap-2">
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="카테고리를 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(courseMeta?.categories ?? []).map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setIsAddCategoryOpen(true)}
                      title="새 카테고리 추가"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="difficultyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>난이도 *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="난이도를 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(courseMeta?.difficultyLevels ?? []).map((diff) => (
                        <SelectItem key={diff.id} value={diff.id}>
                          {diff.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="curriculum"
            render={({ field }) => (
              <FormItem>
                <FormLabel>커리큘럼</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="커리큘럼을 입력하세요. Markdown 형식을 지원합니다."
                    className="min-h-[160px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                저장
              </Button>

              {mode === 'edit' && courseId && (
                <Link href={`/instructor/assignments/new?courseId=${courseId}`}>
                  <Button variant="outline" type="button">
                    <Plus className="mr-1 h-4 w-4" />
                    이 코스에 과제 만들기
                  </Button>
                </Link>
              )}
            </div>

            {mode === 'edit' && courseDetail && courseDetail.status !== 'archived' && (
              <>
                <Separator orientation="vertical" className="h-8" />
                <CourseStatusButton
                  courseId={courseDetail.id}
                  currentStatus={courseDetail.status}
                />
              </>
            )}
          </div>
        </form>
      </Form>

      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 카테고리 추가</DialogTitle>
            <DialogDescription>
              추가할 카테고리 이름을 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="카테고리 이름"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCategory();
              }
            }}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewCategoryName('');
                setIsAddCategoryOpen(false);
              }}
            >
              취소
            </Button>
            <Button
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
            >
              {createCategoryMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
