import { useCallback, useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { useAppStoreSelector } from '../../store/hooks';
import { buildPromptText, PromptFormat } from './buildPromptText';
import { IconButton } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { Tabs, TabsList, TabsTrigger } from '../ui/Tabs';

const FORMAT_PREFERENCE_KEY = 'prompt_editor_format_preference';

interface PromptTextPanelProps {
  lockedFormat?: PromptFormat;
}

export function PromptTextPanel({ lockedFormat }: PromptTextPanelProps) {
  const fragments = useAppStoreSelector((s) => s.state.fragments);
  const { showToast } = useToast();
  
  const [internalFormat, setInternalFormat] = useState<PromptFormat>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem(FORMAT_PREFERENCE_KEY) : null;
      if (saved === 'markdown' || saved === 'yaml' || saved === 'xml') {
        return saved as PromptFormat;
      }
    } catch (e) {
      //
    }
    return 'markdown';
  });

  const format = lockedFormat || internalFormat;

  const handleFormatChange = useCallback((v: string) => {
    const next = v as PromptFormat;
    setInternalFormat(next);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(FORMAT_PREFERENCE_KEY, next);
      }
    } catch (e) {
      //
    }
  }, []);

  const promptText = useMemo(() => buildPromptText(fragments, format), [fragments, format]);
  const isEmpty = promptText.trim().length === 0;

  const handleCopy = useCallback(() => {
    if (isEmpty) return;
    
    navigator.clipboard.writeText(promptText).then(() => {
      showToast('已复制', 'success');
    }).catch((err) => {
      console.error('Failed to copy: ', err);
      showToast('复制失败', 'error');
    });
  }, [promptText, isEmpty, showToast]);

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="h-12 px-3 flex items-center justify-between border-b border-gray-200 bg-white shrink-0">
        <span className="text-sm font-semibold text-gray-700">
          提示词生成
        </span>
        
        <div className="flex items-center gap-2">
          {!lockedFormat && (
            <Tabs value={format} onValueChange={handleFormatChange}>
              <TabsList className="h-8">
                <TabsTrigger 
                  value="markdown" 
                  className="text-xs px-2 py-0.5 h-6"
                  data-testid="prompt-text-format-markdown"
                >
                  Markdown
                </TabsTrigger>
                <TabsTrigger 
                  value="yaml" 
                  className="text-xs px-2 py-0.5 h-6"
                  data-testid="prompt-text-format-yaml"
                >
                  YAML
                </TabsTrigger>
                <TabsTrigger 
                  value="xml" 
                  className="text-xs px-2 py-0.5 h-6"
                  data-testid="prompt-text-format-xml"
                >
                  XML
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <IconButton
            onClick={handleCopy}
            disabled={isEmpty}
            title="复制全部"
            data-testid="prompt-text-copy"
            variant="secondary"
            size="sm"
          >
            <Copy className="w-4 h-4" />
          </IconButton>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isEmpty ? (
          <div data-testid="prompt-text-empty" className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
            <p className="text-sm">片段区为空，请从右侧加入提示词</p>
          </div>
        ) : (
          <div
            data-testid="prompt-text"
            className="font-mono text-sm text-gray-800 whitespace-pre-wrap break-all leading-relaxed select-text bg-gray-50/50 p-4 rounded-lg border border-gray-100"
          >
            {promptText}
          </div>
        )}
      </div>
    </div>
  );
}
