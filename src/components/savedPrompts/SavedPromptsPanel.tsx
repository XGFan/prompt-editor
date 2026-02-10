import React, { useState, useRef, useMemo } from 'react';
import { useAppStoreSelector } from '../../store/hooks';
import { useToast } from '../ui/Toast';
import { SavedPromptItem } from './SavedPromptItem';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Archive, Plus, Tag, Search, X } from 'lucide-react';
import { cn } from '../ui/Button';

export function SavedPromptsPanel() {
  const { state, saveCurrentFragmentsAsSavedPrompt } = useAppStoreSelector((s) => s);
  const { savedPrompts } = state;
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const nameInputRef = useRef<HTMLInputElement>(null);

  const toTestIdSlug = (tag: string) => {
    return tag.toLowerCase().replace(/[^a-z0-9]/g, '-');
  };

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    Object.values(savedPrompts.items).forEach(prompt => {
      prompt.tags.forEach(tag => {
        tagsSet.add(tag);
      });
    });
    return Array.from(tagsSet).sort();
  }, [savedPrompts.items]);

  const filteredPrompts = useMemo(() => {
    let prompts = savedPrompts.order
      .map(id => savedPrompts.items[id])
      .filter((p): p is typeof savedPrompts.items[string] => !!p);

    prompts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      prompts = prompts.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    if (selectedTags.length > 0) {
      prompts = prompts.filter(p =>
        p.tags.some(t => selectedTags.includes(t))
      );
    }

    return prompts;
  }, [savedPrompts.order, savedPrompts.items, searchQuery, selectedTags]);

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('请输入成品名称', 'error');
      nameInputRef.current?.focus();
      return;
    }

    try {
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      await saveCurrentFragmentsAsSavedPrompt({ name, tags: tagList });
      showToast('已保存成品', 'success');
      setName('');
      setTags('');
    } catch (e: any) {
      showToast(e.message || '保存失败', 'error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const isEmpty = savedPrompts.order.length === 0;

  return (
    <div className="flex flex-col h-full bg-gray-50" data-testid="saved-prompts-panel">
      <div className="p-3 bg-white border-b border-gray-200 flex flex-col gap-2 shadow-sm shrink-0 z-10">
        <div className="flex flex-col gap-2">
          <Input
            ref={nameInputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="成品名称..."
            className="h-8 text-sm"
          />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="标签 (逗号分隔)"
                className="h-8 pl-7 text-xs"
              />
            </div>
            <Button 
              size="sm" 
              onClick={handleSave} 
              data-testid="saved-prompts-save"
              className="whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              保存成品
            </Button>
          </div>
        </div>
      </div>

      {!isEmpty && (
        <div className="px-3 pt-3 flex flex-col gap-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索名称或标签..."
              className="h-8 pl-7 text-xs"
              data-testid="saved-prompts-search"
            />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          
          {allTags.length > 0 && (
            <div 
              className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto"
              data-testid="saved-prompts-tags-filter"
            >
              {allTags.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    data-testid={`saved-prompts-tag-${toTestIdSlug(tag)}`}
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer",
                      isSelected 
                        ? "bg-blue-100 border-blue-200 text-blue-700 font-medium" 
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 p-3">
        {isEmpty ? (
          <div 
            data-testid="saved-prompts-empty"
            className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 text-center"
          >
            <div className="bg-gray-100 p-4 rounded-full">
              <Archive className="w-8 h-8 opacity-20" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">暂无成品</p>
              <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed">
                将当前的片段组合保存为成品，方便日后直接复用
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => nameInputRef.current?.focus()}
              className="mt-2"
            >
              保存当前成品
            </Button>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            {filteredPrompts.length > 0 ? (
              filteredPrompts.map((prompt) => (
                <SavedPromptItem 
                  key={prompt.id} 
                  prompt={prompt} 
                />
              ))
            ) : (
              <div className="text-center text-gray-400 text-xs py-8">
                未找到匹配的成品
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
