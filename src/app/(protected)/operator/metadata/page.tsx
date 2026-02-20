'use client';

import { MetadataPage } from '@/features/operator/components/metadata-page';

type OperatorMetadataPageProps = {
  params: Promise<Record<string, never>>;
};

export default function OperatorMetadata({ params }: OperatorMetadataPageProps) {
  void params;
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">메타데이터 관리</h1>
        <p className="text-muted-foreground">카테고리와 난이도를 관리하세요.</p>
      </header>
      <MetadataPage />
    </div>
  );
}
