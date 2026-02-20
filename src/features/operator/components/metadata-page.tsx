'use client';

import { useState } from 'react';
import { Loader2, Pencil, X, Check, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCategoriesQuery } from '@/features/operator/hooks/useCategoriesQuery';
import { useCreateCategoryMutation } from '@/features/operator/hooks/useCreateCategoryMutation';
import { useUpdateCategoryMutation } from '@/features/operator/hooks/useUpdateCategoryMutation';
import { useDifficultyLevelsQuery } from '@/features/operator/hooks/useDifficultyLevelsQuery';
import { useCreateDifficultyLevelMutation } from '@/features/operator/hooks/useCreateDifficultyLevelMutation';
import { useUpdateDifficultyLevelMutation } from '@/features/operator/hooks/useUpdateDifficultyLevelMutation';
import type { Category, DifficultyLevel } from '@/features/operator/lib/dto';

type TabType = 'categories' | 'difficulty-levels';

type EditState = {
  id: string;
  name: string;
};

type AddState = {
  active: boolean;
  name: string;
};

type MetadataTableProps<T extends Category | DifficultyLevel> = {
  items: T[];
  isLoading: boolean;
  isError: boolean;
  addState: AddState;
  editState: EditState | null;
  isSaving: boolean;
  onAddStart: () => void;
  onAddChange: (name: string) => void;
  onAddSave: () => void;
  onAddCancel: () => void;
  onEditStart: (item: T) => void;
  onEditChange: (name: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onToggleActive: (item: T) => void;
};

const MetadataTable = <T extends Category | DifficultyLevel>({
  items,
  isLoading,
  isError,
  addState,
  editState,
  isSaving,
  onAddStart,
  onAddChange,
  onAddSave,
  onAddCancel,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
  onToggleActive,
}: MetadataTableProps<T>) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive p-4 text-destructive">
        목록을 불러오는데 실패했습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!addState.active ? (
          <Button size="sm" onClick={onAddStart}>
            <Plus className="mr-2 h-4 w-4" />
            추가
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              value={addState.name}
              onChange={(e) => onAddChange(e.target.value)}
              placeholder="이름을 입력하세요"
              className="h-8 w-48"
              onKeyDown={(e) => {
                if (e.key === 'Enter') onAddSave();
                if (e.key === 'Escape') onAddCancel();
              }}
              autoFocus
            />
            <Button
              size="sm"
              onClick={onAddSave}
              disabled={!addState.name.trim() || isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
            <Button size="sm" variant="ghost" onClick={onAddCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">항목이 없습니다.</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {editState?.id === item.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editState.name}
                          onChange={(e) => onEditChange(e.target.value)}
                          className="h-8 w-48"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') onEditSave();
                            if (e.key === 'Escape') onEditCancel();
                          }}
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={onEditSave}
                          disabled={!editState.name.trim() || isSaving}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={onEditCancel}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className={item.isActive ? '' : 'text-muted-foreground line-through'}>
                        {item.name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? 'default' : 'outline'}>
                      {item.isActive ? '활성' : '비활성'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {editState?.id !== item.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEditStart(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onToggleActive(item)}
                        disabled={isSaving}
                      >
                        {item.isActive ? '비활성화' : '활성화'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

const CategoriesTab = () => {
  const [addState, setAddState] = useState<AddState>({ active: false, name: '' });
  const [editState, setEditState] = useState<EditState | null>(null);

  const { data, isLoading, isError } = useCategoriesQuery();
  const createMutation = useCreateCategoryMutation();
  const updateMutation = useUpdateCategoryMutation();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleAddSave = () => {
    if (!addState.name.trim()) return;
    createMutation.mutate(
      { name: addState.name.trim() },
      { onSuccess: () => setAddState({ active: false, name: '' }) },
    );
  };

  const handleEditSave = () => {
    if (!editState || !editState.name.trim()) return;
    updateMutation.mutate(
      { categoryId: editState.id, body: { name: editState.name.trim() } },
      { onSuccess: () => setEditState(null) },
    );
  };

  const handleToggleActive = (item: Category) => {
    updateMutation.mutate({ categoryId: item.id, body: { isActive: !item.isActive } });
  };

  return (
    <MetadataTable
      items={data?.categories ?? []}
      isLoading={isLoading}
      isError={isError}
      addState={addState}
      editState={editState}
      isSaving={isSaving}
      onAddStart={() => setAddState({ active: true, name: '' })}
      onAddChange={(name) => setAddState((prev) => ({ ...prev, name }))}
      onAddSave={handleAddSave}
      onAddCancel={() => setAddState({ active: false, name: '' })}
      onEditStart={(item) => setEditState({ id: item.id, name: item.name })}
      onEditChange={(name) => setEditState((prev) => (prev ? { ...prev, name } : null))}
      onEditSave={handleEditSave}
      onEditCancel={() => setEditState(null)}
      onToggleActive={handleToggleActive}
    />
  );
};

const DifficultyLevelsTab = () => {
  const [addState, setAddState] = useState<AddState>({ active: false, name: '' });
  const [editState, setEditState] = useState<EditState | null>(null);

  const { data, isLoading, isError } = useDifficultyLevelsQuery();
  const createMutation = useCreateDifficultyLevelMutation();
  const updateMutation = useUpdateDifficultyLevelMutation();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleAddSave = () => {
    if (!addState.name.trim()) return;
    createMutation.mutate(
      { name: addState.name.trim() },
      { onSuccess: () => setAddState({ active: false, name: '' }) },
    );
  };

  const handleEditSave = () => {
    if (!editState || !editState.name.trim()) return;
    updateMutation.mutate(
      { levelId: editState.id, body: { name: editState.name.trim() } },
      { onSuccess: () => setEditState(null) },
    );
  };

  const handleToggleActive = (item: DifficultyLevel) => {
    updateMutation.mutate({ levelId: item.id, body: { isActive: !item.isActive } });
  };

  return (
    <MetadataTable
      items={data?.difficultyLevels ?? []}
      isLoading={isLoading}
      isError={isError}
      addState={addState}
      editState={editState}
      isSaving={isSaving}
      onAddStart={() => setAddState({ active: true, name: '' })}
      onAddChange={(name) => setAddState((prev) => ({ ...prev, name }))}
      onAddSave={handleAddSave}
      onAddCancel={() => setAddState({ active: false, name: '' })}
      onEditStart={(item) => setEditState({ id: item.id, name: item.name })}
      onEditChange={(name) => setEditState((prev) => (prev ? { ...prev, name } : null))}
      onEditSave={handleEditSave}
      onEditCancel={() => setEditState(null)}
      onToggleActive={handleToggleActive}
    />
  );
};

export const MetadataPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('categories');

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b">
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'categories'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('categories')}
        >
          카테고리
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'difficulty-levels'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('difficulty-levels')}
        >
          난이도
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === 'categories' ? '카테고리 관리' : '난이도 관리'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeTab === 'categories' ? <CategoriesTab /> : <DifficultyLevelsTab />}
        </CardContent>
      </Card>
    </div>
  );
};
