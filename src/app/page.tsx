"use client";

import { useState } from "react";
import { CourseFilters } from "@/features/course/components/course-filters";
import { CourseList } from "@/features/course/components/course-list";
import { useCourseListQuery } from "@/features/course/hooks/useCourseListQuery";
import { DEFAULT_PAGE_SIZE } from "@/features/course/constants";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Home() {

  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [difficultyId, setDifficultyId] = useState("");
  const [sort, setSort] = useState<"latest" | "popular">("latest");
  const [page, setPage] = useState(1);

  const query = {
    q: q || undefined,
    categoryId: categoryId || undefined,
    difficultyId: difficultyId || undefined,
    sort,
    page,
    limit: DEFAULT_PAGE_SIZE,
  };

  const { data, isLoading: isCoursesLoading, isError } = useCourseListQuery(query);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  const handleChangeQ = (value: string) => {
    setQ(value);
    setPage(1);
  };

  const handleChangeCategoryId = (value: string) => {
    setCategoryId(value);
    setPage(1);
  };

  const handleChangeDifficultyId = (value: string) => {
    setDifficultyId(value);
    setPage(1);
  };

  const handleChangeSort = (value: string) => {
    setSort(value as "latest" | "popular");
    setPage(1);
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">코스 탐색</h1>
        <p className="text-muted-foreground">
          다양한 코스를 탐색하고 수강신청하세요.
        </p>
      </header>

      <CourseFilters
        q={q}
        categoryId={categoryId}
        difficultyId={difficultyId}
        sort={sort}
        onChangeQ={handleChangeQ}
        onChangeCategoryId={handleChangeCategoryId}
        onChangeDifficultyId={handleChangeDifficultyId}
        onChangeSort={handleChangeSort}
      />

      <CourseList
        courses={data?.courses}
        isLoading={isCoursesLoading}
        isError={isError}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
