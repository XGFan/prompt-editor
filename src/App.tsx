import React, { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from './store/store';
import { RightPanel } from './components/rightPanel/RightPanel';
import { FragmentsPanel } from './components/fragments/FragmentsPanel';
import { PromptTextPanel } from './components/promptText/PromptTextPanel';
import { ToastProvider } from './components/ui/Toast';
import { Splitter } from './components/layout/Splitter';
import { ShortcutHelp } from './components/ui/ShortcutHelp';
import { HostSdkIntegrationDemo } from './sdk/demo/HostSdkIntegrationDemo';

function AppContent() {
  const { hydrateFromStorage, state, setColumnWidths, resetColumnWidths, save } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const pendingDelta = useRef({ fragments: 0, library: 0 });
  
  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  const libraryWidth = state.ui.columnWidths.library;
  const fragmentsWidth = state.ui.columnWidths.fragments;

  const updateColumnWidths = useCallback((dFragments: number, dLibrary: number) => {
    pendingDelta.current.fragments += dFragments;
    pendingDelta.current.library += dLibrary;

    if (!requestRef.current) {
      requestRef.current = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const totalWidth = containerRef.current.offsetWidth;
        // Get fresh state to avoid closure staleness
        const currentWidths = useAppStore.getState().state.ui.columnWidths;
        
        setColumnWidths({
          totalWidth,
          fragments: currentWidths.fragments + pendingDelta.current.fragments,
          library: currentWidths.library + pendingDelta.current.library,
        });

        pendingDelta.current = { fragments: 0, library: 0 };
        requestRef.current = undefined;
      });
    }
  }, [setColumnWidths]);

  const handleLeftResize = useCallback((delta: number) => {
    updateColumnWidths(delta, 0);
  }, [updateColumnWidths]);

  const handleRightResize = useCallback((delta: number) => {
    // Dragging right splitter to right (positive delta) decreases library width
    updateColumnWidths(0, -delta);
  }, [updateColumnWidths]);

  const handleResizeEnd = useCallback(() => {
    save();
  }, [save]);

  const handleReset = useCallback(() => {
    if (!containerRef.current) return;
    resetColumnWidths({ totalWidth: containerRef.current.offsetWidth });
    // Save after reset
    requestAnimationFrame(() => save());
  }, [resetColumnWidths, save]);

  return (
    <div ref={containerRef} className="relative flex h-screen w-full overflow-hidden bg-gray-50 text-gray-900 font-sans" data-testid="panel-container">
      <aside 
        data-testid="panel-fragments"
        className="flex-none h-full bg-white border-r border-gray-200" 
        style={{ width: fragmentsWidth }}
      >
        <FragmentsPanel />
      </aside>

      <Splitter
        id="splitter-left"
        onResize={handleLeftResize}
        onResizeEnd={handleResizeEnd}
        onDoubleClick={handleReset}
      />

      <main 
        data-testid="panel-text"
        className="flex-1 min-w-[360px] bg-white border-r border-gray-200 overflow-hidden"
      >
        <PromptTextPanel />
      </main>

      <Splitter
        id="splitter-right"
        onResize={handleRightResize}
        onResizeEnd={handleResizeEnd}
        onDoubleClick={handleReset}
      />

      <aside 
        data-testid="panel-library"
        className="flex-none h-full" 
        style={{ width: libraryWidth }}
      >
        <RightPanel />
      </aside>

      <ShortcutHelp />
    </div>
  );
}

function App() {
  if (new URLSearchParams(window.location.search).get('sdkDemo') === '1') {
    return <HostSdkIntegrationDemo />;
  }

  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
