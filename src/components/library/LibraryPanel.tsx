import React, { useEffect, useRef, useState } from 'react';
import { useAppStoreSelector, useCurrentAppStoreApi } from '../../store/hooks';
import { exportLibraryToJson, importLibraryFromJson, previewLibraryJson } from '../../domain/libraryIo';
import { SortableLibraryItem } from './SortableLibraryItem';
import { Button, IconButton } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { useToast } from '../ui/Toast';
import { useHotkeys } from '../../hooks/useHotkeys';
import { Search, Plus, Download, Upload, FolderPlus, GripVertical, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import { 
  DndContext, 
  DragOverlay, 
  pointerWithin,
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
import { sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { LibraryItem } from './LibraryItem';
import type { GroupId, PromptId, PromptItem } from '../../domain/types';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

interface LibraryTabRowProps {
  groupId: GroupId;
  groupName: string;
  count: number;
  readOnly: boolean;
  isMenuOpen: boolean;
  isDeleteConfirm: boolean;
  isRenaming: boolean;
  onRenameStart: (groupId: GroupId) => void;
  onRenameSubmit: (groupId: GroupId, newName: string) => void;
  onRenameCancel: () => void;
  onToggleMenu: (groupId: GroupId) => void;
  onDeleteGroup: (groupId: GroupId) => void;
}

function LibraryTabRow({
  groupId,
  groupName,
  count,
  readOnly,
  isMenuOpen,
  isDeleteConfirm,
  isRenaming,
  onRenameStart,
  onRenameSubmit,
  onRenameCancel,
  onToggleMenu,
  onDeleteGroup,
}: LibraryTabRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: groupId,
    data: { type: 'GROUP' },
    disabled: readOnly || isRenaming,
  });

  const [editName, setEditName] = useState(groupName);
  
  useEffect(() => {
    setEditName(groupName);
  }, [groupName, isRenaming]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      onRenameSubmit(groupId, editName);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setEditName(groupName);
      onRenameCancel();
    }
  };

  const handleBlur = () => {
    onRenameSubmit(groupId, editName);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : 'auto',
      }}
      className={`group relative w-full my-0.5 ${isDragging ? 'z-50' : ''}`}
      data-testid={`library-group-${groupName}`}
    >
      <TabsTrigger
        value={groupId}
        data-testid={`library-tab-${groupId}`}
        className={`relative w-full flex items-center gap-2 rounded-md py-2 pl-7 pr-8 text-sm font-medium outline-none transition-all hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-blue-500 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 ${
          isOver && !isDragging ? 'bg-blue-50 ring-2 ring-blue-200' : ''
        }`}
        title={groupName}
        disabled={isRenaming}
      >
        {isRenaming ? (
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 h-5 px-1 text-sm bg-white border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900"
          />
        ) : (
          <span className="flex-1 truncate text-left">
            {groupName}
          </span>
        )}
        
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 group-data-[state=active]:text-blue-500 font-mono group-hover:opacity-0 transition-opacity">
          {count}
        </span>
      </TabsTrigger>

      {!readOnly && !isRenaming && (
        <>
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="absolute left-1 top-1/2 -translate-y-1/2 p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-transparent border-none"
            data-testid={`library-drag-handle-group-${groupId}`}
            onClick={(e) => e.stopPropagation()}
            aria-label="拖拽排序"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <div className="relative">
              <button
                type="button"
                className="p-1 rounded-md hover:bg-gray-200 text-gray-500 bg-transparent border-none cursor-pointer"
                title="菜单"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMenu(groupId);
                }}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-full z-30 mt-1 w-32 rounded-md border border-gray-100 bg-white py-1 shadow-lg text-left">
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 text-gray-700 hover:bg-gray-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRenameStart(groupId);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    重命名
                  </button>
                  <button
                    type="button"
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 ${
                      isDeleteConfirm ? 'bg-red-600 text-white hover:bg-red-700' : 'text-red-600 hover:bg-red-50'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteGroup(groupId);
                    }}
                  >
                    {isDeleteConfirm ? (
                      <span className="font-bold whitespace-nowrap">
                        确认
                      </span>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        删除
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function LibraryPanel({ readOnly = false }: LibraryPanelProps) {
  const { 
    state, 
    createGroup, 
    createPrompt,
    deleteGroup,
    save,
    movePrompt,
    reorderPromptWithinGroup,
    reorderGroup,
    renameGroup
  } = useAppStoreSelector((s) => s);
  const appStoreApi = useCurrentAppStoreApi();
  const { showToast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<{ groupCount: number; promptCount: number } | null>(null);
  const [importContent, setImportContent] = useState<string>('');
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [menuOpenGroupId, setMenuOpenGroupId] = useState<GroupId | null>(null);
  const [deleteConfirmGroupId, setDeleteConfirmGroupId] = useState<GroupId | null>(null);
  const [renamingGroupId, setRenamingGroupId] = useState<GroupId | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'GROUP' | 'PROMPT' | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const newGroupInputRef = useRef<HTMLInputElement>(null);
  const deleteTimeoutRef = useRef<number | undefined>(undefined);

  const groupOrder = state.library.groupOrder;
  const persistedActiveLibraryGroupId = state.ui.activeLibraryGroupId as GroupId | null;
  const activeGroupId =
    persistedActiveLibraryGroupId && groupOrder.includes(persistedActiveLibraryGroupId)
      ? persistedActiveLibraryGroupId
      : groupOrder[0] ?? null;

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visiblePromptsByGroup = groupOrder.reduce<Record<GroupId, PromptItem[]>>((acc, groupId) => {
    const group = state.library.groups[groupId];
    if (!group) {
      acc[groupId] = [];
      return acc;
    }

    acc[groupId] = group.promptIds
      .map((id) => state.library.prompts[id])
      .filter((prompt): prompt is PromptItem => Boolean(prompt))
      .filter((prompt) => !normalizedQuery || prompt.content.toLowerCase().includes(normalizedQuery));

    return acc;
  }, {} as Record<GroupId, PromptItem[]>);

  useEffect(() => {
    if (activeGroupId === state.ui.activeLibraryGroupId) {
      return;
    }

    appStoreApi.setState((prev) => ({
      ...prev,
      state: {
        ...prev.state,
        ui: {
          ...prev.state.ui,
          activeLibraryGroupId: activeGroupId,
        },
      },
    }));
  }, [activeGroupId, appStoreApi, state.ui.activeLibraryGroupId]);

  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) {
        window.clearTimeout(deleteTimeoutRef.current);
      }
    };
  }, []);

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

  const setActiveGroupId = (nextGroupId: string) => {
    appStoreApi.setState((prev) => ({
      ...prev,
      state: {
        ...prev.state,
        ui: {
          ...prev.state.ui,
          activeLibraryGroupId: nextGroupId,
        },
      },
    }));
  };

  const handleCreatePromptInGroup = (groupId: GroupId) => {
    if (readOnly) return;
    createPrompt({ area: 'library', groupId, content: '' });
    setActiveGroupId(groupId);
  };

  const handleToggleGroupMenu = (groupId: GroupId) => {
    setDeleteConfirmGroupId(null);
    setMenuOpenGroupId((prev) => (prev === groupId ? null : groupId));
  };

  const handleDeleteGroupFromMenu = (groupId: GroupId) => {
    if (readOnly) return;

    if (deleteConfirmGroupId === groupId) {
      deleteGroup({ area: 'library', groupId });
      setDeleteConfirmGroupId(null);
      setMenuOpenGroupId(null);
      if (deleteTimeoutRef.current) {
        window.clearTimeout(deleteTimeoutRef.current);
      }
      return;
    }

    setDeleteConfirmGroupId(groupId);
    if (deleteTimeoutRef.current) {
      window.clearTimeout(deleteTimeoutRef.current);
    }
    deleteTimeoutRef.current = window.setTimeout(() => {
      setDeleteConfirmGroupId(null);
    }, 3000);
  };

  const handleRenameStart = (groupId: GroupId) => {
    if (readOnly) return;
    setRenamingGroupId(groupId);
    setMenuOpenGroupId(null);
  };

  const handleRenameSubmit = (groupId: GroupId, newName: string) => {
    const trimmed = newName.trim();
    if (trimmed && trimmed !== state.library.groups[groupId]?.name) {
      try {
        renameGroup({ area: 'library', groupId, name: trimmed });
        showToast('重命名成功', 'success');
      } catch (e) {
        showToast('重命名失败', 'error');
      }
    }
    setRenamingGroupId(null);
  };

  const handleRenameCancel = () => {
    setRenamingGroupId(null);
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
      collisionDetection={pointerWithin}
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
        <div className="flex-1 min-h-0 overflow-hidden relative">
          <div className="absolute right-4 bottom-4 flex flex-col gap-2 z-20">
            {!readOnly && (
              <IconButton 
                onClick={handleImportClick} 
                title="导入数据" 
                size="md"
                className="bg-white shadow-md border border-gray-200 hover:bg-gray-50 rounded-full h-10 w-10"
              >
                <Upload className="w-5 h-5" />
              </IconButton>
            )}
            <IconButton 
              onClick={handleExport} 
              title="导出数据" 
              size="md"
              className="bg-white shadow-md border border-gray-200 hover:bg-gray-50 rounded-full h-10 w-10"
            >
              <Download className="w-5 h-5" />
            </IconButton>
          </div>
          <div className="flex flex-1 overflow-hidden min-h-0 h-full">
            <Tabs
              orientation="vertical"
                value={activeGroupId}
                onValueChange={setActiveGroupId}
                className="flex flex-1 min-h-0 overflow-hidden h-full"
              >
                <div className="flex flex-col w-[140px] border-r border-gray-200 h-full bg-gray-50/50 shrink-0">
  
                    <SortableContext items={groupOrder} strategy={verticalListSortingStrategy}>
                      <TabsList className="flex-1 w-full flex-col items-stretch justify-start gap-0.5 overflow-y-auto p-1 custom-scrollbar border-0 bg-transparent">
                        {groupOrder.map((groupId) => {
                          const group = state.library.groups[groupId];
                          if (!group) return null;

                          return (
                            <LibraryTabRow
                              key={groupId}
                              groupId={groupId}
                              groupName={group.name}
                              count={visiblePromptsByGroup[groupId]?.length ?? 0}
                              readOnly={readOnly}
                              isMenuOpen={menuOpenGroupId === groupId}
                              isDeleteConfirm={deleteConfirmGroupId === groupId}
                              isRenaming={renamingGroupId === groupId}
                              onRenameStart={handleRenameStart}
                              onRenameSubmit={handleRenameSubmit}
                              onRenameCancel={handleRenameCancel}
                              onToggleMenu={handleToggleGroupMenu}
                              onDeleteGroup={handleDeleteGroupFromMenu}
                            />
                          );
                        })}
                        {!readOnly && (
                          isCreatingGroup ? (
                            <div className="flex items-center w-full h-8 px-2 gap-2 bg-white border border-blue-200 rounded shadow-sm shrink-0 mx-1 my-0.5">
                              <FolderPlus className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <input
                                ref={newGroupInputRef}
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                onKeyDown={handleNewGroupKeyDown}
                                onBlur={submitNewGroup}
                                placeholder="分组名称..."
                                className="flex-1 min-w-0 h-6 text-sm bg-transparent border-none outline-none placeholder:text-gray-400"
                                autoFocus
                              />
                            </div>
                          ) : (
                            <button
                              className="w-full flex items-center gap-2 py-2 pl-7 pr-4 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 rounded-md transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 my-0.5"
                              onClick={handleCreateGroup}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              新建分组
                            </button>
                          )
                        )}
                      </TabsList>
                    </SortableContext>
                </div>

                <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden bg-white">
                  {groupOrder.map((groupId) => {
                    const group = state.library.groups[groupId];
                    if (!group) return null;

                    const visiblePrompts = visiblePromptsByGroup[groupId] ?? [];

                    return (
                      <TabsContent
                        key={groupId}
                        value={groupId}
                        className="flex flex-col h-full flex-1 m-0 p-0 min-h-0"
                      >
                        <div className="flex items-center gap-2 px-3 h-12 shrink-0 border-b border-gray-200 bg-white">
                          <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder={`搜索 ${group.name}...`}
                              className="w-full h-8 pl-8 pr-2 text-xs bg-gray-50 border-0 rounded-md focus:ring-1 focus:ring-blue-500/50 focus:bg-white transition-colors placeholder:text-gray-400"
                            />
                          </div>
                          {!readOnly && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 text-gray-500 hover:text-gray-900 p-0"
                              onClick={() => handleCreatePromptInGroup(groupId)}
                              title="新建片段"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                          <div className="flex flex-col gap-0.5 min-h-[4px]">
                            <SortableContext items={visiblePrompts.map((prompt) => prompt.id)} strategy={verticalListSortingStrategy}>
                              {visiblePrompts.map((prompt) => (
                                <SortableLibraryItem
                                  key={prompt.id}
                                  prompt={prompt}
                                  groupId={group.id}
                                  readOnly={readOnly}
                                  searchQuery={searchQuery}
                                />
                              ))}
                            </SortableContext>

                            {visiblePrompts.length === 0 && (
                              <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
                                {searchQuery ? (
                                  <>
                                    <Search className="w-8 h-8 opacity-20" />
                                    <span className="text-xs">无匹配结果</span>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-8 h-8 rounded-lg border border-dashed border-gray-200 flex items-center justify-center">
                                      <Plus className="w-4 h-4 opacity-30" />
                                    </div>
                                    <span className="text-xs">暂无片段</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </TabsContent>
                    );
                  })}
                </div>
              </Tabs>
            </div>
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeGroup ? (
            <div className="relative flex w-[140px] items-center gap-2 rounded-md bg-white py-2 pl-7 pr-2 text-sm font-medium shadow-xl ring-2 ring-blue-500/20 rotate-1">
              <div className="absolute left-1 top-1/2 -translate-y-1/2 p-1 text-gray-400">
                <GripVertical className="w-3.5 h-3.5" />
              </div>
              <span className="flex-1 truncate text-left">{activeGroup.name}</span>
              <span className="shrink-0 text-[10px] text-gray-400 font-mono">
                {activeGroup.promptIds.length}
              </span>
            </div>
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
