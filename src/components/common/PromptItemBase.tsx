import React, { forwardRef, useCallback, useEffect, useRef, useState } from 'react'
import { Check, Edit2, Trash2, X } from 'lucide-react'
import { Button, IconButton, cn } from '../ui/Button'

interface PromptItemBaseProps {
  itemKey: string
  content: string
  isExpanded: boolean
  onToggleExpand: () => void
  onSaveContent: (nextContent: string) => void
  onDeleteItem: () => void
  renderContent?: (content: string) => React.ReactNode
  dragHandle?: React.ReactNode
  extraActionsBefore?: React.ReactNode
  extraActionsAfter?: React.ReactNode
  saveOnShiftEnter?: boolean
  style?: React.CSSProperties
  className?: string
  viewTestId?: string
  editTestId?: string
  readOnly?: boolean
}

export const PromptItemBase = forwardRef<HTMLDivElement, PromptItemBaseProps>(
  (
    {
      itemKey,
      content,
      isExpanded,
      onToggleExpand,
      onSaveContent,
      onDeleteItem,
      renderContent,
      dragHandle,
      extraActionsBefore,
      extraActionsAfter,
      saveOnShiftEnter = true,
      style,
      className,
      viewTestId,
      editTestId,
      readOnly = false,
      ...props
    },
    ref,
  ) => {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(content)
    const [deleteConfirm, setDeleteConfirm] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const internalRef = useRef<HTMLDivElement>(null)
    const autoEditHandledRef = useRef(false)
    const deleteTimeoutRef = useRef<number | null>(null)

    const adjustHeight = useCallback((_val?: string) => {
      if (!textareaRef.current) return
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }, [])

    const setRefs = useCallback(
      (node: HTMLDivElement | null) => {
        internalRef.current = node
        if (typeof ref === 'function') {
          ref(node)
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
        }
      },
      [ref],
    )

    useEffect(() => {
      if (isEditing && textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length)
        adjustHeight(editValue)
      }
    }, [isEditing, adjustHeight, editValue])

    useEffect(() => {
      autoEditHandledRef.current = false
      setEditValue(content)
    }, [itemKey, content])

    useEffect(() => {
      if (readOnly) return
      if (autoEditHandledRef.current) return
      if (isEditing) return
      if (content.trim().length > 0) return

      autoEditHandledRef.current = true
      setEditValue(content)
      setIsEditing(true)
    }, [itemKey, content, isEditing, readOnly])

    const handleEditChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      setEditValue(val)
    }

    useEffect(() => {
      if (isEditing) adjustHeight(editValue)
    }, [editValue, isEditing, adjustHeight])

    const handleDeleteClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      if (readOnly) return
      if (deleteConfirm) {
        onDeleteItem()
        setDeleteConfirm(false)
      } else {
        setDeleteConfirm(true)
        deleteTimeoutRef.current = window.setTimeout(() => {
          setDeleteConfirm(false)
        }, 3000)
      }
    }

    useEffect(() => {
      if (!deleteConfirm) return
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setDeleteConfirm(false)
          if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current)
        }
      }
      window.addEventListener('keydown', handleEsc)
      return () => window.removeEventListener('keydown', handleEsc)
    }, [deleteConfirm])

    const handleSave = () => {
      if (readOnly) {
        setIsEditing(false)
        return
      }
      const trimmed = editValue.trim()

      if (!trimmed) {
        onDeleteItem()
        setIsEditing(false)
        return
      }

      if (trimmed !== content) {
        onSaveContent(trimmed)
      }
      setIsEditing(false)
    }

    const handleCancel = () => {
      if (!content.trim()) {
        onDeleteItem()
        setIsEditing(false)
        return
      }

      setEditValue(content)
      setIsEditing(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (saveOnShiftEnter || !e.shiftKey)) {
        e.preventDefault()
        handleSave()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleCancel()
      }
    }

    useEffect(() => {
      if (!isEditing) return

      const handleClickOutside = (event: MouseEvent) => {
        if (internalRef.current && !internalRef.current.contains(event.target as Node)) {
          handleCancel()
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [isEditing, handleCancel])

    if (isEditing) {
      return (
        <div
          ref={setRefs}
          style={style}
          className={cn('relative group p-2 rounded-md border border-blue-200 bg-white shadow-sm my-1', className)}
          {...props}
          {...(editTestId ? { 'data-testid': editTestId } : {})}
        >
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={handleEditChange}
            onKeyDown={handleKeyDown}
            rows={1}
            className="w-full text-sm resize-none outline-none bg-transparent overflow-y-auto leading-5"
            placeholder="输入内容..."
            style={{ maxHeight: '120px' }}
          />
          <div className="flex justify-end gap-1 mt-2">
            <IconButton size="sm" onClick={handleCancel} title="取消">
              <X className="w-4 h-4" />
            </IconButton>
            <IconButton size="sm" variant="secondary" onClick={handleSave} title="保存">
              <Check className="w-4 h-4 text-green-600" />
            </IconButton>
          </div>
        </div>
      )
    }

    return (
      <div
        ref={setRefs}
        style={style}
        className={cn(
          'group relative flex gap-2 rounded-md border border-transparent px-2 py-2 text-sm transition-all hover:bg-gray-50 hover:shadow-sm',
          // isExpanded ? 'bg-gray-50 border-gray-100' : '', // Removed selection highlight
          className,
        )}
        {...props}
        {...(viewTestId ? { 'data-testid': viewTestId } : {})}
        onMouseLeave={() => deleteConfirm && setDeleteConfirm(false)}
      >
        {dragHandle && (
          <div className="flex-none mt-0.5 text-gray-400 cursor-grab active:cursor-grabbing hover:text-gray-600">
            {dragHandle}
          </div>
        )}
        <div className="flex-1 min-w-0 relative">
          <div
            role="button"
            tabIndex={0}
            className={cn(
              'cursor-pointer text-gray-700 leading-relaxed whitespace-normal break-words focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded',
              !isExpanded && 'line-clamp-3 max-h-[4.5em] overflow-hidden',
            )}
            onClick={onToggleExpand}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onToggleExpand()
              }
            }}
            title={isExpanded ? '收起' : '展开'}
          >
            {renderContent ? renderContent(content) : content}
          </div>

          {!readOnly && (
            <div
              className={cn(
                'absolute right-0 bottom-0 flex items-center justify-end gap-1 rounded-md border border-gray-200 bg-white/95 px-1 py-0.5 shadow-sm backdrop-blur-sm opacity-0 transition-opacity',
                'group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto',
              )}
            >
              {!deleteConfirm && (
                <>
                  {extraActionsBefore}
                  <IconButton size="sm" onClick={(e) => { e.stopPropagation(); setIsEditing(true) }} title="编辑">
                    <Edit2 className="w-3.5 h-3.5" />
                  </IconButton>
                  {extraActionsAfter}
                </>
              )}

              {deleteConfirm ? (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleDeleteClick}
                  title="确认删除"
                  className="h-6 px-2 text-[11px]"
                >
                  确认删除
                </Button>
              ) : (
                <IconButton
                  size="sm"
                  onClick={handleDeleteClick}
                  title="删除"
                  className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </IconButton>
              )}
            </div>
          )}
        </div>
      </div>
    )
  },
)

PromptItemBase.displayName = 'PromptItemBase'
