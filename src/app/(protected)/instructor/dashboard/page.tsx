'use client';

type InstructorDashboardPageProps = {
  params: Promise<Record<string, never>>;
};

export default function InstructorDashboardPage({
  params,
}: InstructorDashboardPageProps) {
  void params;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Instructor 대시보드</h1>
        <p className="text-muted-foreground">
          추후 구현 예정입니다.
        </p>
      </header>
    </div>
  );
}
