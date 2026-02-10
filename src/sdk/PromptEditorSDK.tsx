import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react'

import { FragmentsPanel } from '../components/fragments/FragmentsPanel'
import { Splitter } from '../components/layout/Splitter'
import { PromptTextPanel } from '../components/promptText/PromptTextPanel'
import { RightPanel } from '../components/rightPanel/RightPanel'
import { ShortcutHelp } from '../components/ui/ShortcutHelp'
import { ToastProvider } from '../components/ui/Toast'
import { useAppStoreSelector, useCurrentAppStoreApi } from '../store/hooks'
import type { AppStore } from '../store/store'
import { PromptEditorSDKStoreProvider } from './state'
import { validatePromptEditorBeforeSave } from './validation'
import type {
  PromptEditorError,
  PromptEditorLibrary,
  PromptEditorSDKHandle,
  PromptEditorSDKProps,
  PromptEditorSaveResult,
  PromptEditorValidationInput,
  PromptEditorValue,
} from './types'

const UNKNOWN_SAVE_ERROR: PromptEditorError = {
  code: 'SDK_SAVE_FAILED',
  message: 'save failed',
  source: 'sdk',
  severity: 'error',
}

const VALIDATION_FAILED_ERROR: PromptEditorError = {
  code: 'SDK_SAVE_BLOCKED',
  message: 'save blocked by validation',
  source: 'sdk',
  severity: 'error',
}

const READ_ONLY_ERROR: PromptEditorError = {
  code: 'SDK_READ_ONLY',
  message: 'readOnly mode enabled',
  source: 'sdk',
  severity: 'error',
}

const buildValueFromStore = (
  store: AppStore,
  fallback: PromptEditorValue,
): PromptEditorValue => ({
  fragments: store.state.fragments,
  ui: store.state.ui,
  sessionUi: store.sessionUi,
  version: fallback.version,
  meta: fallback.meta,
})

const buildValidationInputFromStore = (
  store: AppStore,
  fallback: PromptEditorValue,
  fallbackLibrary: PromptEditorLibrary,
): PromptEditorValidationInput => ({
  library: (store.state.library as PromptEditorLibrary) ?? fallbackLibrary,
  ...buildValueFromStore(store, fallback),
})

function PromptEditorSDKInner(
  { value, initialLibrary, disabled = false, readOnly = false, onLibraryChange, onSave, onCancel, onError, validate }: PromptEditorSDKProps,
  ref: React.ForwardedRef<PromptEditorSDKHandle>,
) {
  const sdkReadOnly = Boolean(disabled || readOnly)
  const storeApi = useCurrentAppStoreApi()
  const containerRef = useRef<HTMLDivElement>(null)
  const requestRef = useRef<number>()
  const pendingDelta = useRef({ fragments: 0, library: 0 })
  const isSyncingFromPropsRef = useRef(false)
  const latestValueRef = useRef<PromptEditorValue>(value)
  const latestOnSaveRef = useRef(onSave)
  const latestOnCancelRef = useRef(onCancel)
  const latestOnErrorRef = useRef(onError)
  const latestValidateRef = useRef(validate)
  const latestReadOnlyRef = useRef(sdkReadOnly)
  const latestOnLibraryChangeRef = useRef(onLibraryChange)
  const latestInitialLibraryRef = useRef(initialLibrary)
  const latestEmittedLibraryRef = useRef<PromptEditorLibrary>(initialLibrary)
  const hasInitializedLibraryRef = useRef(false)

  latestValueRef.current = value
  latestOnSaveRef.current = onSave
  latestOnCancelRef.current = onCancel
  latestOnErrorRef.current = onError
  latestValidateRef.current = validate
  latestReadOnlyRef.current = sdkReadOnly
  latestOnLibraryChangeRef.current = onLibraryChange
  latestInitialLibraryRef.current = initialLibrary

  const getValue = useCallback((): PromptEditorValue => {
    return buildValueFromStore(storeApi.getState(), latestValueRef.current)
  }, [storeApi])

  useLayoutEffect(() => {
    if (hasInitializedLibraryRef.current) {
      return
    }

    hasInitializedLibraryRef.current = true
    latestEmittedLibraryRef.current = initialLibrary
    isSyncingFromPropsRef.current = true
    storeApi.setState((prev) => ({
      ...prev,
      state: {
        ...prev.state,
        library: initialLibrary,
      },
    }))
    isSyncingFromPropsRef.current = false
  }, [initialLibrary, storeApi])

  useLayoutEffect(() => {
    const current = storeApi.getState()
    const shouldSyncFragments = value.fragments !== current.state.fragments
    const shouldSyncUi = value.ui !== undefined && value.ui !== current.state.ui
    const shouldSyncSessionUi = value.sessionUi !== undefined && value.sessionUi !== current.sessionUi

    if (!shouldSyncFragments && !shouldSyncUi && !shouldSyncSessionUi) {
      return
    }

    isSyncingFromPropsRef.current = true
    storeApi.setState((prev) => ({
      ...prev,
      state: {
        ...prev.state,
        ...(shouldSyncFragments ? { fragments: value.fragments } : {}),
        ...(shouldSyncUi ? { ui: value.ui } : {}),
      },
      ...(shouldSyncSessionUi ? { sessionUi: value.sessionUi } : {}),
    }))
    isSyncingFromPropsRef.current = false
  }, [storeApi, value])

  useEffect(() => {
    return storeApi.subscribe((nextStore) => {
      if (isSyncingFromPropsRef.current) {
        return
      }

      const nextLibrary = nextStore.state.library as PromptEditorLibrary
      if (nextLibrary !== latestEmittedLibraryRef.current) {
        latestEmittedLibraryRef.current = nextLibrary
        latestOnLibraryChangeRef.current?.(nextLibrary)
      }
    })
  }, [storeApi])

  const updateColumnWidths = useCallback(
    (dFragments: number, dLibrary: number) => {
      pendingDelta.current.fragments += dFragments
      pendingDelta.current.library += dLibrary

      if (!requestRef.current) {
        requestRef.current = requestAnimationFrame(() => {
          if (!containerRef.current) {
            requestRef.current = undefined
            return
          }
          const totalWidth = containerRef.current.offsetWidth
          const currentWidths = storeApi.getState().state.ui.columnWidths

          storeApi.getState().setColumnWidths({
            totalWidth,
            fragments: currentWidths.fragments + pendingDelta.current.fragments,
            library: currentWidths.library + pendingDelta.current.library,
          })

          pendingDelta.current = { fragments: 0, library: 0 }
          requestRef.current = undefined
        })
      }
    },
    [storeApi],
  )

  useEffect(() => {
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }
    }
  }, [])

  const requestSave = useCallback(async (): Promise<PromptEditorSaveResult> => {
    if (latestReadOnlyRef.current) {
      latestOnErrorRef.current?.(READ_ONLY_ERROR)
      return {
        ok: false,
        value: getValue().fragments,
        error: READ_ONLY_ERROR,
        errors: [READ_ONLY_ERROR],
      }
    }

    const snapshot = getValue()
    const validationInput = buildValidationInputFromStore(
      storeApi.getState(),
      snapshot,
      latestInitialLibraryRef.current,
    )
    const validationResult = await validatePromptEditorBeforeSave(validationInput, latestValidateRef.current)

    if (!validationResult.canSave || !validationResult.value) {
      const error = validationResult.errors[0] ?? VALIDATION_FAILED_ERROR
      latestOnErrorRef.current?.(error)
      return {
        ok: false,
        value: snapshot.fragments,
        error,
        errors: validationResult.errors,
      }
    }

    try {
      const hostResult = await latestOnSaveRef.current(validationResult.value.fragments)
      if (hostResult && typeof hostResult === 'object' && 'ok' in hostResult) {
        return hostResult
      }
      return {
        ok: true,
        value: validationResult.value.fragments,
      }
    } catch (cause) {
      const error: PromptEditorError = {
        ...UNKNOWN_SAVE_ERROR,
        cause,
      }
      latestOnErrorRef.current?.(error)
      return {
        ok: false,
        value: snapshot.fragments,
        error,
      }
    }
  }, [getValue, storeApi])

  const requestCancel = useCallback(() => {
    latestOnCancelRef.current()
  }, [])

  useImperativeHandle(
    ref,
    (): PromptEditorSDKHandle => ({
      requestSave,
      requestCancel,
      getValue,
    }),
    [getValue, requestCancel, requestSave],
  )

  const libraryWidth = useAppStoreSelector((store) => store.state.ui.columnWidths.library)
  const fragmentsWidth = useAppStoreSelector((store) => store.state.ui.columnWidths.fragments)

  const handleLeftResize = useCallback(
    (delta: number) => {
      updateColumnWidths(delta, 0)
    },
    [updateColumnWidths],
  )

  const handleRightResize = useCallback(
    (delta: number) => {
      updateColumnWidths(0, -delta)
    },
    [updateColumnWidths],
  )

  const handleReset = useCallback(() => {
    if (!containerRef.current) {
      return
    }
    storeApi.getState().resetColumnWidths({ totalWidth: containerRef.current.offsetWidth })
  }, [storeApi])

  return (
    <div
      ref={containerRef}
      data-testid="sdk-editor-root"
      aria-readonly={sdkReadOnly}
      className="relative flex h-full w-full overflow-hidden bg-gray-50 text-gray-900 font-sans"
    >
      <aside
        data-testid="panel-fragments"
        className="flex-none h-full bg-white border-r border-gray-200"
        style={{ width: fragmentsWidth }}
      >
        <FragmentsPanel readOnly={sdkReadOnly} />
      </aside>

      <Splitter id="splitter-left" onResize={handleLeftResize} onDoubleClick={handleReset} />

      <main
        data-testid="panel-text"
        className="flex-1 min-w-[360px] bg-white border-r border-gray-200 overflow-hidden"
      >
        <PromptTextPanel />
      </main>

      {!sdkReadOnly && (
        <>
          <Splitter id="splitter-right" onResize={handleRightResize} onDoubleClick={handleReset} />
          <aside data-testid="panel-library" className="flex-none h-full" style={{ width: libraryWidth }}>
            <RightPanel hideFinished readOnly={sdkReadOnly} />
          </aside>
        </>
      )}

      <ShortcutHelp />
    </div>
  )
}

const PromptEditorSDKInnerWithRef = forwardRef<PromptEditorSDKHandle, PromptEditorSDKProps>(PromptEditorSDKInner)

export const PromptEditorSDK = forwardRef<PromptEditorSDKHandle, PromptEditorSDKProps>((props, ref) => {
  return (
    <PromptEditorSDKStoreProvider>
      <ToastProvider>
        <PromptEditorSDKInnerWithRef ref={ref} {...props} />
      </ToastProvider>
    </PromptEditorSDKStoreProvider>
  )
})

PromptEditorSDK.displayName = 'PromptEditorSDK'
