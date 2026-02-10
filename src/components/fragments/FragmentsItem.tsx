import React, { forwardRef } from 'react'
import type { GroupId, PromptItem } from '../../domain/types'
import { useAppStoreSelector } from '../../store/hooks'
import { PromptItemBase } from '../common/PromptItemBase'

interface FragmentsItemProps {
  prompt: PromptItem
  groupId: GroupId
  readOnly?: boolean
  dragHandle?: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

export const FragmentsItem = forwardRef<HTMLDivElement, FragmentsItemProps>(
  ({ prompt, groupId, readOnly = false, dragHandle, style, className, ...props }, ref) => {
    const { editPromptContent, deletePrompt, sessionUi, togglePromptExpanded } = useAppStoreSelector((s) => s)

    const isExpanded = sessionUi.expandedPromptIds.includes(prompt.id)

    return (
      <PromptItemBase
        ref={ref}
        itemKey={prompt.id}
        content={prompt.content}
        isExpanded={isExpanded}
        onToggleExpand={() => togglePromptExpanded(prompt.id)}
        onSaveContent={(nextContent) => editPromptContent({ area: 'fragments', promptId: prompt.id, content: nextContent })}
        onDeleteItem={() => deletePrompt({ area: 'fragments', groupId, promptId: prompt.id })}
        readOnly={readOnly}
        saveOnShiftEnter={false}
        dragHandle={dragHandle}
        style={style}
        className={className}
        viewTestId={`fragments-item-${prompt.id}`}
        editTestId={`fragments-item-edit-${prompt.id}`}
        {...props}
      />
    )
  },
)

FragmentsItem.displayName = 'FragmentsItem'
