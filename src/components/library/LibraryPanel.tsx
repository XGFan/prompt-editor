import React, { useState, useRef, useCallback } from 'react';
import { useAppStoreSelector, useCurrentAppStoreApi } from '../../store/hooks';
import { exportLibraryToJson, importLibraryFromJson, previewLibraryJson } from '../../domain/libraryIo';
import { LibraryGroup } from './LibraryGroup';
import { Button, IconButton } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dialog } from '../ui/Dialog';
import { useToast } from '../ui/Toast';
import { useHotkeys } from '../../hooks/useHotkeys';
import { Search, Plus, Download, Upload, FolderPlus, GripVertical } from 'lucide-react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
  MeasuringStrategy
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { LibraryItem } from './LibraryItem';
import type { GroupId, PromptId, PromptItem } from '../../domain/types';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

interface LibraryPanelProps {
  readOnly?: boolean;
}

export function LibraryPanel({ readOnly = false }: LibraryPanelProps) {
  const { 
    state, 
    createGroup, 
    save,
    movePrompt,
    reorderPromptWithinGroup,
    reorderGroup
  } = useAppStoreSelector((s) => s);
  const appStoreApi = useCurrentAppStoreApi();
  const { showToast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<{ groupCount: number; promptCount: number } | null>(null);
  const [importContent, setImportContent] = useState<string>('');
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'GROUP' | 'PROMPT' | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newGroupInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useHotkeys('meta+f', (e) => {
    e.preventDefault();
    searchInputRef.current?.focus();
  });

  useHotkeys('ctrl+f', (e) => {
    e.preventDefault();
    searchInputRef.current?.focus();
  });

  const handleExport = () => {
    try {
      const json = exportLibraryToJson(state.library);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompt-library-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('导出成功', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      showToast('导出失败', 'error');
    }
  };

  const handleImportClick = () => {
    if (readOnly) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        const preview = previewLibraryJson(content);
        setImportPreview(preview);
        setImportContent(content);
        setImportModalOpen(true);
      } catch (error) {
        console.error('Invalid import file:', error);
        showToast('无效的文件格式', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const confirmImport = async () => {
    if (readOnly) return;
    try {
      const newLibrary = importLibraryFromJson(importContent);
      
      appStoreApi.setState(prev => ({
        ...prev,
        state: {
          ...prev.state,
          library: newLibrary
        }
      }));
      
      await save();
      
      setImportModalOpen(false);
      setImportContent('');
      setImportPreview(null);
      showToast('导入成功', 'success');
    } catch (error) {
      console.error('Import execution failed:', error);
      showToast('导入失败', 'error');
    }
  };

  const handleCreateGroup = () => {
    if (readOnly) return;
    setIsCreatingGroup(true);
    setTimeout(() => newGroupInputRef.current?.focus(), 0);
  };

  const submitNewGroup = () => {
    if (readOnly) {
      setIsCreatingGroup(false);
      return;
    }
    const trimmed = newGroupName.trim();
    if (trimmed) {
      try {
        createGroup({ area: 'library', name: trimmed });
        setNewGroupName('');
        setIsCreatingGroup(false);
        showToast('分组已创建', 'success');
      } catch (e) {
        showToast('创建失败 (名称重复?)', 'error');
      }
    } else {
      setIsCreatingGroup(false);
    }
  };

  const handleNewGroupKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      submitNewGroup();
    } else if (e.key === 'Escape') {
      setNewGroupName('');
      setIsCreatingGroup(false);
    }
  };

  const findContainer = (id: string): GroupId | undefined => {
    if (state.library.groups[id as GroupId]) {
      return id as GroupId;
    }
    
    return state.library.groupOrder.find(groupId => 
      state.library.groups[groupId]?.promptIds.includes(id as PromptId)
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (readOnly) return;
    const { active } = event;
    const type = active.data.current?.type;
    setActiveId(active.id as string);
    setActiveType(type);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (readOnly) return;
    const { active, over } = event;
    const overId = over?.id;

    if (!overId || active.id === overId || activeType === 'GROUP') return;

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(overId as string);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    const activeGroup = state.library.groups[activeContainer];
    const overGroup = state.library.groups[overContainer];
    
    if (!activeGroup || !overGroup) return;

    const activeIndex = activeGroup.promptIds.indexOf(active.id as PromptId);
    let overIndex: number;

    if (state.library.groups[overId as GroupId]) {
      overIndex = overGroup.promptIds.length + 1;
    } else {
      const isBelowOverItem =
        over &&
        active.rect.current.translated &&
        active.rect.current.translated.top > over.rect.top + over.rect.height;

      const modifier = isBelowOverItem ? 1 : 0;
      overIndex = overGroup.promptIds.indexOf(overId as PromptId) + modifier;
    }

    movePrompt({
      area: 'library',
      fromGroupId: activeContainer,
      toGroupId: overContainer,
      promptId: active.id as PromptId,
      targetIndex: overIndex,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (readOnly) return;
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      setActiveType(null);
      return;
    }

    if (activeType === 'GROUP') {
      const activeGroupId = active.id as GroupId;
      const overGroupId = state.library.groups[over.id as GroupId]
        ? (over.id as GroupId)
        : findContainer(over.id as string);

      if (!overGroupId || activeGroupId === overGroupId) {
        setActiveId(null);
        setActiveType(null);
        return;
      }

      const oldIndex = state.library.groupOrder.indexOf(activeGroupId);
      const newIndex = state.library.groupOrder.indexOf(overGroupId);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderGroup({
          area: 'library',
          sourceIndex: oldIndex,
          targetIndex: newIndex,
        });
      }
    } else {
      const activeContainer = findContainer(active.id as string);
      const overContainer = findContainer(over.id as string);

      if (
        activeContainer &&
        overContainer &&
        activeContainer === overContainer
      ) {
        const activeGroup = state.library.groups[activeContainer];
        const activeIndex = activeGroup.promptIds.indexOf(active.id as PromptId);
        let overIndex = activeGroup.promptIds.indexOf(over.id as PromptId);

        if (overIndex === -1 && state.library.groups[over.id as GroupId]) {
          overIndex = activeGroup.promptIds.length - 1;
        }

        if (activeIndex !== overIndex && overIndex !== -1) {
          reorderPromptWithinGroup({
            area: 'library',
            groupId: activeContainer,
            sourceIndex: activeIndex,
            targetIndex: overIndex,
          });
        }
      }
    }

    setActiveId(null);
    setActiveType(null);
    save();
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setActiveType(null);
  };

  const activeGroup = activeType === 'GROUP' && activeId ? state.library.groups[activeId as GroupId] : null;
  const activePrompt = activeType === 'PROMPT' && activeId ? state.library.prompts[activeId as PromptId] : null;
  const activePromptGroupId = activeType === 'PROMPT' && activeId ? findContainer(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
      autoScroll
    >
      <div className="flex flex-col h-full bg-white border-r border-gray-200">
        <div className="flex flex-col gap-2 p-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                ref={searchInputRef}
                placeholder="搜索提示词..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8"
              />
            </div>
            <div className="flex items-center">
              {!readOnly && (
                <IconButton onClick={handleImportClick} title="导入数据" size="sm">
                  <Upload className="w-4 h-4" />
                </IconButton>
              )}
              <IconButton onClick={handleExport} title="导出数据" size="sm">
                <Download className="w-4 h-4" />
              </IconButton>
            </div>
          </div>
          
          {!readOnly && (
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleCreateGroup}
              className="w-full justify-start gap-2 text-gray-600 font-normal"
            >
              <Plus className="w-4 h-4" />
              新建分组
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          {isCreatingGroup && (
            <div className="p-2 border-b border-blue-100 bg-blue-50/30">
              <input
                ref={newGroupInputRef}
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={handleNewGroupKeyDown}
                onBlur={submitNewGroup}
                placeholder="分组名称..."
                className="w-full h-8 px-2 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
          )}

          <SortableContext items={state.library.groupOrder} strategy={verticalListSortingStrategy}>
            {state.library.groupOrder.map((groupId: GroupId) => {
              const group = state.library.groups[groupId];
              if (!group) return null;

              const groupPrompts = group.promptIds
                .map(id => state.library.prompts[id])
                .filter((p): p is NonNullable<typeof p> => !!p);

              return (
                <LibraryGroup
                  key={groupId}
                  group={group}
                  prompts={groupPrompts}
                  readOnly={readOnly}
                  searchQuery={searchQuery}
                />
              );
            })}
          </SortableContext>

          {state.library.groupOrder.length === 0 && !isCreatingGroup && (
            <div data-testid="library-empty" className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
              <FolderPlus className="w-8 h-8 opacity-20" />
              <span className="text-sm">暂无分组</span>
              {!readOnly && <Button size="sm" variant="ghost" onClick={handleCreateGroup}>新建</Button>}
            </div>
          )}
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeGroup ? (
            <LibraryGroup
              group={activeGroup}
              prompts={activeGroup.promptIds.map(id => state.library.prompts[id]).filter(Boolean) as PromptItem[]}
              readOnly={readOnly}
              searchQuery={searchQuery}
              className="opacity-90 shadow-xl ring-2 ring-blue-500/20 rotate-1 bg-white"
              style={{ cursor: 'grabbing', pointerEvents: 'none' }}
              isOverlay
            />
          ) : activePrompt && activePromptGroupId ? (
            <LibraryItem
              prompt={activePrompt}
              groupId={activePromptGroupId}
              readOnly={readOnly}
              className="bg-white shadow-lg ring-2 ring-blue-500/20 rotate-2 cursor-grabbing opacity-90"
              dragHandle={
                <div className="p-1 rounded text-gray-400">
                  <GripVertical className="w-3.5 h-3.5" />
                </div>
              }
            />
          ) : null}
        </DragOverlay>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".json"
          onChange={handleFileChange}
        />

        <Dialog
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          title="导入提示"
          width="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setImportModalOpen(false)}>
                取消
              </Button>
              <Button onClick={confirmImport}>
                覆盖导入
              </Button>
            </>
          }
        >
          <div className="py-4 text-center">
            <p className="text-gray-600 mb-2">
              当前数据将被以下内容覆盖：
            </p>
            {importPreview && (
              <div className="flex justify-center gap-6 font-medium text-gray-900">
                <div className="flex flex-col items-center">
                  <span className="text-2xl">{importPreview.groupCount}</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">分组</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl">{importPreview.promptCount}</span>
                  <span className="text-xs text-gray-500 uppercase tracking-wide">条提示词</span>
                </div>
              </div>
            )}
            <p className="mt-4 text-xs text-red-500 bg-red-50 p-2 rounded">
              警告：操作不可撤销
            </p>
          </div>
        </Dialog>
      </div>
    </DndContext>
  );
}
