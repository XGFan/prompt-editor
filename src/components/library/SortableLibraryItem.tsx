import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { LibraryItem } from './LibraryItem';
import type { PromptItem, GroupId } from '../../domain/types';

interface SortableLibraryItemProps {
  prompt: PromptItem;
  groupId: GroupId;
  searchQuery?: string;
  readOnly?: boolean;
}

export function SortableLibraryItem({ prompt, groupId, searchQuery, readOnly = false }: SortableLibraryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: prompt.id, data: { type: 'PROMPT', prompt, groupId }, disabled: readOnly });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const DragHandle = readOnly ? null : (
    <div 
      {...attributes} 
      {...listeners} 
      className="p-1 rounded cursor-grab active:cursor-grabbing hover:bg-gray-200"
      data-testid={`drag-handle-${prompt.id}`}
    >
      <GripVertical className="w-3.5 h-3.5" />
    </div>
  );

  return (
    <LibraryItem
      ref={setNodeRef}
      style={style}
      prompt={prompt}
      groupId={groupId}
      readOnly={readOnly}
      searchQuery={searchQuery}
      dragHandle={DragHandle}
      data-testid={`library-item-${prompt.id}`}
    />
  );
}
