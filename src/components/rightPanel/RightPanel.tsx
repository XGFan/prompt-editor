import React, { useState } from 'react';
import { LibraryPanel } from '../library/LibraryPanel';
import { SavedPromptsPanel } from '../savedPrompts/SavedPromptsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Archive, BookOpen } from 'lucide-react';

interface RightPanelProps {
  hideFinished?: boolean
  readOnly?: boolean
}

export function RightPanel({ hideFinished = false, readOnly = false }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState("fragments");

  if (hideFinished) {
    return (
      <div className="flex flex-col h-full bg-white overflow-hidden">
        <div className="flex flex-col gap-2 p-3 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">片段库</span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <LibraryPanel readOnly={readOnly} />
        </div>
      </div>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full bg-white overflow-hidden">
      <div className="h-12 px-2 flex items-center bg-white border-b border-gray-200 shrink-0">
        <TabsList className={`grid w-full ${hideFinished ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <TabsTrigger value="fragments" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span>片段库</span>
          </TabsTrigger>
          {!hideFinished && (
            <TabsTrigger value="finished" className="flex items-center gap-2">
              <Archive className="w-4 h-4" />
              <span>成品库</span>
            </TabsTrigger>
          )}
        </TabsList>
      </div>

      <div className="flex-1 overflow-hidden relative">
          <TabsContent value="fragments" forceMount className="mt-0 h-full w-full absolute inset-0">
             <LibraryPanel readOnly={readOnly} />
          </TabsContent>

          {!hideFinished && (
            <TabsContent value="finished" forceMount className="mt-0 h-full w-full absolute inset-0 bg-gray-50">
              <SavedPromptsPanel />
            </TabsContent>
          )}
      </div>
    </Tabs>
  );
}
