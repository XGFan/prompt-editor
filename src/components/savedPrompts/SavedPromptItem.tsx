import React, { useState, useEffect, useRef } from 'react';
import { useAppStoreSelector } from '../../store/hooks';
import { useToast } from '../ui/Toast';
import type { SavedPrompt } from '../../domain/types';
import { IconButton } from '../ui/Button';
import { Input } from '../ui/Input';
import { Trash2, Edit2, Play, Check, X, Tag } from 'lucide-react';
import { cn } from '../ui/Button';

interface SavedPromptItemProps {
  prompt: SavedPrompt;
  className?: string;
}

export function SavedPromptItem({ prompt, className }: SavedPromptItemProps) {
  const { 
    loadSavedPromptToFragments, 
    renameSavedPrompt, 
    updateSavedPromptTags, 
    deleteSavedPrompt 
  } = useAppStoreSelector((s) => s);
  const { showToast } = useToast();

  const [isRenaming, setIsRenaming] = useState(false);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [nameValue, setNameValue] = useState(prompt.name);
  const [tagsValue, setTagsValue] = useState(prompt.tags.join(', '));
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const deleteTimeoutRef = useRef<number>();

  const nameInputRef = useRef<HTMLInputElement>(null);
  const tagsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isRenaming && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isRenaming]);

  useEffect(() => {
    if (isEditingTags && tagsInputRef.current) {
      tagsInputRef.current.focus();
    }
  }, [isEditingTags]);

  const handleLoad = async () => {
    await loadSavedPromptToFragments({ savedPromptId: prompt.id });
    showToast('已加载到片段区', 'success');
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteConfirm) {
      await deleteSavedPrompt({ savedPromptId: prompt.id });
      setDeleteConfirm(false);
    } else {
      setDeleteConfirm(true);
      deleteTimeoutRef.current = window.setTimeout(() => {
        setDeleteConfirm(false);
      }, 3000);
    }
  };

  const handleRenameSave = async () => {
    try {
      if (nameValue.trim() !== prompt.name) {
        await renameSavedPrompt({ savedPromptId: prompt.id, name: nameValue });
        showToast('重命名成功', 'success');
      }
      setIsRenaming(false);
    } catch (e: any) {
      showToast(e.message || '重命名失败', 'error');
    }
  };

  const handleTagsSave = async () => {
    try {
      const tags = tagsValue.split(',').map(t => t.trim()).filter(Boolean);
      await updateSavedPromptTags({ savedPromptId: prompt.id, tags });
      setIsEditingTags(false);
    } catch (e: any) {
      showToast(e.message || '修改标签失败', 'error');
    }
  };

  useEffect(() => {
    if (!deleteConfirm) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDeleteConfirm(false);
        if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [deleteConfirm]);

  const handleRenameCancel = () => {
    setNameValue(prompt.name);
    setIsRenaming(false);
  };

  const handleTagsCancel = () => {
    setTagsValue(prompt.tags.join(', '));
    setIsEditingTags(false);
  };

  const handleKeyDownRename = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleRenameCancel();
    }
  };

  const handleKeyDownTags = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTagsSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleTagsCancel();
    }
  };

  return (
    <div 
      className={cn(
        "group flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-3 shadow-sm hover:border-blue-200 transition-all",
        className
      )}
      data-testid={`saved-prompts-item-${prompt.id}`}
    >
      <div className="flex items-center justify-between gap-2">
        {isRenaming ? (
          <div className="flex-1 flex items-center gap-1">
            <Input
              ref={nameInputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={handleKeyDownRename}
              className="h-7 text-sm font-medium"
              placeholder="输入名称"
            />
            <IconButton size="sm" onClick={handleRenameSave} title="保存" className="text-green-600">
              <Check className="w-4 h-4" />
            </IconButton>
            <IconButton size="sm" onClick={handleRenameCancel} title="取消">
              <X className="w-4 h-4" />
            </IconButton>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-2 min-w-0">
             <button 
              type="button"
              className="font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600 focus:outline-none focus:text-blue-600 bg-transparent border-none p-0 text-left w-full"
              onClick={() => setIsRenaming(true)}
              title="点击重命名"
            >
              {prompt.name}
            </button>
          </div>
        )}

        {!isRenaming && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <IconButton 
              size="sm" 
              onClick={handleLoad} 
              title="加载此成品"
              data-testid={`saved-prompts-load-${prompt.id}`}
              className="text-blue-600 hover:bg-blue-50"
            >
              <Play className="w-3.5 h-3.5" />
            </IconButton>
            <IconButton 
              size="sm" 
              onClick={() => setIsRenaming(true)} 
              title="重命名"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </IconButton>
             <button
              type="button"
              onClick={handleDeleteClick}
              data-testid={`saved-prompts-delete-${prompt.id}`}
              className={cn(
                "inline-flex items-center justify-center h-6 rounded px-2 text-xs font-medium transition-all",
                deleteConfirm 
                  ? "bg-red-600 text-white w-auto" 
                  : "bg-transparent text-gray-400 hover:text-red-600 hover:bg-red-50 w-6"
              )}
              title={deleteConfirm ? "确认删除" : "删除"}
            >
              {deleteConfirm ? "确认删除" : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 min-h-[20px]">
        {isEditingTags ? (
          <div className="flex-1 flex items-center gap-1">
             <Tag className="w-3 h-3 flex-shrink-0 text-gray-400" />
            <Input
              ref={tagsInputRef}
              value={tagsValue}
              onChange={(e) => setTagsValue(e.target.value)}
              onKeyDown={handleKeyDownTags}
              className="h-6 text-xs"
              placeholder="标签 (逗号分隔)"
            />
            <IconButton size="sm" onClick={handleTagsSave} title="保存" className="text-green-600">
              <Check className="w-3 h-3" />
            </IconButton>
            <IconButton size="sm" onClick={handleTagsCancel} title="取消">
              <X className="w-3 h-3" />
            </IconButton>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1 overflow-hidden">
            <button 
              type="button"
              className="flex flex-wrap gap-1 cursor-pointer hover:bg-gray-50 rounded px-1 -ml-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-200 bg-transparent border-none text-left w-full"
              onClick={() => setIsEditingTags(true)}
              title="点击修改标签"
            >
              {prompt.tags.length > 0 ? (
                prompt.tags.map(tag => (
                  <span key={tag} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    {tag}
                  </span>
                ))
              ) : (
                 <span className="text-gray-300 flex items-center gap-1 hover:text-gray-500">
                    <Tag className="w-3 h-3" /> 添加标签
                 </span>
              )}
            </button>
          </div>
        )}
        
        {!isEditingTags && (
           <span className="shrink-0 text-gray-400 text-[10px]">
            {new Date(prompt.updatedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}
