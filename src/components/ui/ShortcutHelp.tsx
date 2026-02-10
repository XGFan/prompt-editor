import React, { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { IconButton } from './Button'

const shortcuts = [
  { key: 'Ctrl/Cmd + F', desc: '聚焦右侧片段库搜索框' },
  { key: 'Enter', desc: '编辑输入中保存' },
  { key: 'Esc', desc: '取消编辑/关闭确认态' },
]

export function ShortcutHelp() {
  const [open, setOpen] = useState(false)

  return (
    <div className="absolute left-3 bottom-3 z-20">
      {open && (
        <div className="mb-2 w-64 rounded-lg border border-gray-200 bg-white/95 backdrop-blur p-3 shadow-lg">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">快捷键帮助</h3>
          <ul className="space-y-1.5">
            {shortcuts.map((item) => (
              <li key={item.key} className="flex items-start justify-between gap-3 text-xs text-gray-700">
                <span className="font-mono text-gray-900">{item.key}</span>
                <span className="text-right">{item.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <IconButton
        size="md"
        variant="secondary"
        title={open ? '关闭快捷键帮助' : '查看快捷键帮助'}
        aria-label={open ? '关闭快捷键帮助' : '查看快捷键帮助'}
        onClick={() => setOpen((v) => !v)}
      >
        <HelpCircle className="w-4 h-4" />
      </IconButton>
    </div>
  )
}
