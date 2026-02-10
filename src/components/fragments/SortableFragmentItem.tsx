import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FragmentsItem } from './FragmentsItem';
import type { PromptItem, GroupId } from '../../domain/types';
import { GripVertical } from 'lucide-react';

interface SortableFragmentItemProps {
  prompt: PromptItem;
  groupId: GroupId;
  readOnly?: boolean;
}

export function SortableFragmentItem({ prompt, groupId, readOnly = false }: SortableFragmentItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: prompt.id,
    data: {
      type: 'PROMPT',
      prompt,
      groupId,
    },
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <FragmentsItem
      ref={setNodeRef}
      style={style}
      prompt={prompt}
      groupId={groupId}
      readOnly={readOnly}
      dragHandle={
        readOnly ? null : (
          <div 
            {...attributes} 
            {...listeners} 
            className="p-1 rounded cursor-grab active:cursor-grabbing hover:bg-gray-100"
            data-testid={`fragments-drag-handle-${prompt.id}`}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        )
      }
    />
  );
}
