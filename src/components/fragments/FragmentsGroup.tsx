import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { useAppStoreSelector } from '../../store/hooks';
import type { PromptGroup, PromptItem } from '../../domain/types';
import { SortableFragmentItem } from './SortableFragmentItem';
import { IconButton } from '../ui/Button';
import { ChevronRight, Plus, MoreHorizontal, Trash2, Edit2, GripVertical } from 'lucide-react';
import { cn } from '../ui/Button';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface FragmentsGroupProps {
  group: PromptGroup;
  prompts: PromptItem[];
  readOnly?: boolean;
  dragHandle?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  isOverlay?: boolean;
}

export const FragmentsGroup = forwardRef<HTMLDivElement, FragmentsGroupProps>(({ group, prompts, readOnly = false, dragHandle, style, className, isOverlay }, ref) => {
  const { 
    toggleGroupCollapsed, 
    createPrompt, 
    deleteGroup, 
    renameGroup 
  } = useAppStoreSelector((s) => s);

  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(group.name);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const deleteTimeoutRef = useRef<number>();
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: group.id,
    data: {
      type: 'GROUP',
      group,
    },
    disabled: Boolean(isOverlay || readOnly)
  });

  const combinedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    if (typeof ref === 'function') {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  };

  const sortableStyle: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 999 : 'auto',
    ...style
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleCreatePrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    createPrompt({ area: 'fragments', groupId: group.id, content: '' });
    if (group.collapsed) {
      toggleGroupCollapsed({ area: 'fragments', groupId: group.id });
    }
  };

  const handleDeleteGroup = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    if (deleteConfirm) {
      deleteGroup({ area: 'fragments', groupId: group.id });
      setDeleteConfirm(false);
      setMenuOpen(false);
    } else {
      setDeleteConfirm(true);
      deleteTimeoutRef.current = window.setTimeout(() => {
        setDeleteConfirm(false);
      }, 3000);
    }
  };

  const handleRenameSave = () => {
    if (readOnly) return;
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== group.name) {
      try {
        renameGroup({ area: 'fragments', groupId: group.id, name: trimmed });
      } catch (error) {
        console.error("Failed to rename group:", error);
      }
    }
    setIsRenaming(false);
    setMenuOpen(false);
  };

  const handleRenameCancel = () => {
    setRenameValue(group.name);
    setIsRenaming(false);
    setMenuOpen(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSave();
    } else if (e.key === 'Escape') {
      handleRenameCancel();
    }
  };

  return (
    <div 
      ref={combinedRef}
      style={sortableStyle}
      className={cn(
        "flex flex-col border-b border-gray-100 last:border-0 transition-colors bg-white",
        isOver && !isDragging ? "bg-blue-50/50" : "",
        className
      )}
      data-testid={`fragments-group-${group.name}`}
    >
      <div 
        className="group flex items-center h-9 px-2 hover:bg-gray-50 select-none"
      >
        {dragHandle ? dragHandle : (
          <div 
            {...attributes} 
            {...listeners} 
            className="p-1 rounded cursor-grab active:cursor-grabbing hover:bg-gray-100 mr-1 text-gray-400"
            data-testid={`fragments-group-drag-handle-${group.id}`}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
        )}

        <div 
          role="button"
          tabIndex={0}
          className="flex-1 flex items-center gap-1 min-w-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-1"
          onClick={() => !isRenaming && toggleGroupCollapsed({ area: 'fragments', groupId: group.id })}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !isRenaming) {
              e.preventDefault();
              toggleGroupCollapsed({ area: 'fragments', groupId: group.id });
            }
          }}
          aria-expanded={!group.collapsed}
        >
          <div className="w-5 flex items-center justify-center text-gray-400">
            <ChevronRight 
              className={cn(
                "w-4 h-4 transition-transform duration-200", 
                !group.collapsed && "rotate-90"
              )} 
            />
          </div>

          <div className="flex-1 flex items-center gap-2 min-w-0">
            {isRenaming ? (
              <div 
                className="flex items-center gap-1 flex-1" 
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                role="none"
              >
                <input
                  ref={inputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={handleRenameKeyDown}
                  onBlur={handleRenameSave}
                  className="flex-1 h-6 text-sm px-1 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  aria-label="重命名分组"
                />
              </div>
            ) : (
              <>
                <span className="text-sm font-medium text-gray-700 truncate">
                  {group.name}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                  {prompts.length}
                </span>
              </>
            )}
          </div>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
            {!isRenaming && (
              <>
                <IconButton 
                  size="sm" 
                  onClick={handleCreatePrompt}
                  title="添加提示词"
                >
                  <Plus className="w-4 h-4" />
                </IconButton>
                
                <div className="relative" ref={menuRef}>
                  <IconButton 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(!menuOpen);
                      setDeleteConfirm(false);
                    }}
                    title="菜单"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </IconButton>

                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-100 py-1 z-10 animate-in fade-in zoom-in-95 duration-100">
                      <button
                        type="button"
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsRenaming(true);
                          setMenuOpen(false);
                        }}
                      >
                        <Edit2 className="w-3 h-3" />
                        重命名
                      </button>
                      
                      <button
                        type="button"
                        className={cn(
                          "w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors",
                          deleteConfirm 
                            ? "bg-red-600 text-white hover:bg-red-700" 
                            : "text-red-600 hover:bg-red-50"
                        )}
                        onClick={handleDeleteGroup}
                      >
                        {deleteConfirm ? (
                          <span className="font-bold whitespace-nowrap">
                            {prompts.length > 0 ? `确认删除（将删除 ${prompts.length} 条）` : '确认删除'}
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
              </>
            )}
          </div>
        )}
      </div>

      {!group.collapsed && (
        <div className="flex flex-col gap-0.5 px-2 pb-2 min-h-[4px]">
          <SortableContext items={prompts.map(p => p.id)} strategy={verticalListSortingStrategy}>
            {prompts.map(prompt => (
              <SortableFragmentItem 
                key={prompt.id} 
                prompt={prompt} 
                groupId={group.id}
                readOnly={readOnly}
              />
            ))}
          </SortableContext>
          {prompts.length === 0 && (
             <div className="px-8 py-2 text-xs text-gray-400 italic">
               暂无提示词
             </div>
          )}
        </div>
      )}
    </div>
  );
});

FragmentsGroup.displayName = 'FragmentsGroup';
