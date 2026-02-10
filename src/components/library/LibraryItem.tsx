import React, { forwardRef } from 'react'
import type { PromptItem, GroupId } from '../../domain/types'
import { useAppStoreSelector } from '../../store/hooks'
import { useToast } from '../ui/Toast'
import { IconButton } from '../ui/Button'
import { ArrowLeft, Copy } from 'lucide-react'
import { PromptItemBase } from '../common/PromptItemBase'

interface LibraryItemProps {
  prompt: PromptItem
  groupId: GroupId
  searchQuery?: string
  readOnly?: boolean
  dragHandle?: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

export const LibraryItem = forwardRef<HTMLDivElement, LibraryItemProps>(
  ({ prompt, groupId, searchQuery, readOnly = false, dragHandle, style, className, ...props }, ref) => {
    const { editPromptContent, deletePrompt, duplicatePrompt, addLibraryPromptToFragments, sessionUi, togglePromptExpanded } =
      useAppStoreSelector((s) => s)
    const { showToast } = useToast()

    const isExpanded = sessionUi.expandedPromptIds.includes(prompt.id)

    const handleDuplicate = (e: React.MouseEvent) => {
      e.stopPropagation()
      duplicatePrompt({ area: 'library', groupId, promptId: prompt.id })
      showToast('已复制', 'success')
    }

    const handleAddToFragments = (e: React.MouseEvent) => {
      e.stopPropagation()
      try {
        addLibraryPromptToFragments({ libraryPromptId: prompt.id, libraryGroupId: groupId })
        showToast('已加入片段区', 'success')
      } catch (error) {
        console.error(error)
        showToast('添加失败', 'error')
      }
    }

    const renderContent = (content: string) => {
      if (!searchQuery) return content

      const parts: string[] = []
      let lastIndex = 0
      const lowerText = content.toLowerCase()
      const lowerQuery = searchQuery.toLowerCase()

      let index = lowerText.indexOf(lowerQuery)
      while (index !== -1) {
        if (index > lastIndex) {
          parts.push(content.substring(lastIndex, index))
        }
        parts.push(content.substring(index, index + searchQuery.length))
        lastIndex = index + searchQuery.length
        index = lowerText.indexOf(lowerQuery, lastIndex)
      }

      if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex))
      }

      return (
        <span>
          {parts.map((part, i) =>
            part.toLowerCase() === lowerQuery ? (
              <span key={`${prompt.id}-${i}-${part}`} className="bg-yellow-200 text-gray-900 font-medium rounded-sm px-0.5">
                {part}
              </span>
            ) : (
              <span key={`${prompt.id}-${i}-text`}>{part}</span>
            ),
          )}
        </span>
      )
    }

    return (
      <PromptItemBase
        ref={ref}
        itemKey={prompt.id}
        content={prompt.content}
        isExpanded={isExpanded}
        onToggleExpand={() => togglePromptExpanded(prompt.id)}
        onSaveContent={(nextContent) => editPromptContent({ area: 'library', promptId: prompt.id, content: nextContent })}
        onDeleteItem={() => deletePrompt({ area: 'library', groupId, promptId: prompt.id })}
        renderContent={renderContent}
        dragHandle={dragHandle}
        readOnly={readOnly}
        extraActionsBefore={!readOnly ? (
          <IconButton size="sm" onClick={handleAddToFragments} title="加入片段区" className="text-blue-600 hover:bg-blue-50">
            <ArrowLeft className="w-3.5 h-3.5" />
          </IconButton>
        ) : null}
        extraActionsAfter={!readOnly ? (
          <IconButton size="sm" onClick={handleDuplicate} title="复制">
            <Copy className="w-3.5 h-3.5" />
          </IconButton>
        ) : null}
        style={style}
        className={className}
        {...props}
      />
    )
  },
)

LibraryItem.displayName = 'LibraryItem'
