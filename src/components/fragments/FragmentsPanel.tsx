import React, { useState, useRef } from 'react';
import { useAppStoreSelector } from '../../store/hooks';
import { FragmentsGroup } from './FragmentsGroup';
import { Button } from '../ui/Button';
import { Plus, FolderPlus, GripVertical } from 'lucide-react';
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
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { FragmentsItem } from './FragmentsItem';
import type { GroupId, PromptId, PromptItem } from '../../domain/types';

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

interface FragmentsPanelProps {
  readOnly?: boolean;
}

export function FragmentsPanel({ readOnly = false }: FragmentsPanelProps) {
  const { 
    state, 
    createGroup, 
    reorderGroup,
    movePrompt,
    reorderPromptWithinGroup,
    save
  } = useAppStoreSelector((s) => s);
  
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'GROUP' | 'PROMPT' | null>(null);
  
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
        createGroup({ area: 'fragments', name: trimmed });
        setNewGroupName('');
        setIsCreatingGroup(false);
      } catch (e) {
        console.error(e);
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
    if (state.fragments.groups[id as GroupId]) {
      return id as GroupId;
    }
    
    return state.fragments.groupOrder.find(groupId => 
      state.fragments.groups[groupId]?.promptIds.includes(id as PromptId)
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

    const activeGroup = state.fragments.groups[activeContainer];
    const overGroup = state.fragments.groups[overContainer];
    
    if (!activeGroup || !overGroup) return;

    let overIndex: number;
    if (state.fragments.groups[overId as GroupId]) {
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
      area: 'fragments',
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
      const overGroupId = state.fragments.groups[over.id as GroupId]
        ? (over.id as GroupId)
        : findContainer(over.id as string);

      if (!overGroupId || activeGroupId === overGroupId) {
        setActiveId(null);
        setActiveType(null);
        return;
      }

      const oldIndex = state.fragments.groupOrder.indexOf(activeGroupId);
      const newIndex = state.fragments.groupOrder.indexOf(overGroupId);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderGroup({
          area: 'fragments',
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
        const activeGroup = state.fragments.groups[activeContainer];
        const activeIndex = activeGroup.promptIds.indexOf(active.id as PromptId);
        let overIndex = activeGroup.promptIds.indexOf(over.id as PromptId);

        if (overIndex === -1 && state.fragments.groups[over.id as GroupId]) {
           overIndex = activeGroup.promptIds.length - 1;
        }

        if (activeIndex !== overIndex && overIndex !== -1) {
          reorderPromptWithinGroup({
            area: 'fragments',
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

  const activeGroup = activeType === 'GROUP' && activeId ? state.fragments.groups[activeId as GroupId] : null;
  const activePrompt = activeType === 'PROMPT' && activeId ? state.fragments.prompts[activeId as PromptId] : null;
  const activePromptGroupId = activeType === 'PROMPT' && activeId ? findContainer(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
      autoScroll
    >
      <div className="flex flex-col h-full bg-white border-r border-gray-200">
    <div className="h-12 px-3 flex items-center justify-between border-b border-gray-200 bg-white shrink-0">
      <span className="text-sm font-semibold text-gray-700">片段区</span>
      {!readOnly && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleCreateGroup} 
          title="新建分组"
          className="h-8 w-8 text-gray-500 hover:text-gray-900 p-0"
        >
          <Plus className="w-4 h-4" />
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

          <SortableContext items={state.fragments.groupOrder} strategy={verticalListSortingStrategy}>
            {state.fragments.groupOrder.map((groupId: GroupId) => {
              const group = state.fragments.groups[groupId];
              if (!group) return null;
              
              const groupPrompts = group.promptIds
                .map(id => state.fragments.prompts[id])
                .filter((p): p is NonNullable<typeof p> => !!p);
                
              return (
                <FragmentsGroup
                  key={groupId}
                  group={group}
                  prompts={groupPrompts}
                  readOnly={readOnly}
                />
              );
            })}
          </SortableContext>

          {state.fragments.groupOrder.length === 0 && !isCreatingGroup && (
            <div data-testid="fragments-empty" className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
              <FolderPlus className="w-8 h-8 opacity-20" />
              <span className="text-sm">暂无分组</span>
              {!readOnly && <Button size="sm" variant="ghost" onClick={handleCreateGroup}>新建</Button>}
            </div>
          )}
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeGroup ? (
              <FragmentsGroup
                group={activeGroup}
                prompts={activeGroup.promptIds.map(id => state.fragments.prompts[id]).filter(Boolean) as PromptItem[]}
                readOnly={readOnly}
                className="opacity-90 shadow-xl ring-2 ring-blue-500/20 rotate-1 bg-white"
                style={{ cursor: 'grabbing', pointerEvents: 'none' }}
                isOverlay
              />
          ) : activePrompt && activePromptGroupId ? (
            <FragmentsItem
              prompt={activePrompt}
              groupId={activePromptGroupId}
              readOnly={readOnly}
              className="bg-white shadow-lg ring-2 ring-blue-500/20 rotate-2 cursor-grabbing opacity-90"
              style={{ cursor: 'grabbing', pointerEvents: 'none' }}
              dragHandle={
                <div className="p-1 rounded text-gray-600">
                  <GripVertical className="w-3.5 h-3.5" />
                </div>
              }
            />
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
