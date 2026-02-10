import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { AppStoreProvider, useAppStoreFromContext } from '../../store/provider'
import { createAppStore } from '../../store/store'
import { PromptEditorSDKStoreProvider } from '../state'

function StoreIsolationProbe({ label }: { label: string }) {
  const groupCount = useAppStoreFromContext((store) => store.state.library.groupOrder.length)
  const createGroup = useAppStoreFromContext((store) => store.createGroup)

  return (
    <section>
      <div data-testid={`${label}-group-count`}>{groupCount}</div>
      <button onClick={() => createGroup({ area: 'library', name: `${label}-group` })}>add-{label}</button>
    </section>
  )
}

function SdkPersistenceProbe() {
  const save = useAppStoreFromContext((store) => store.save)
  const saveCurrentFragmentsAsSavedPrompt = useAppStoreFromContext((store) => store.saveCurrentFragmentsAsSavedPrompt)
  const [status, setStatus] = useState<'idle' | 'done'>('idle')

  const trigger = async () => {
    await saveCurrentFragmentsAsSavedPrompt({ name: 'SDK Snapshot', tags: [] })
    await save()
    setStatus('done')
  }

  return (
    <section>
      <button onClick={() => void trigger()}>trigger-save</button>
      <div data-testid="sdk-save-status">{status}</div>
    </section>
  )
}

describe('sdk state isolation', () => {
  it('isolates state between two store instances', () => {
    const storeA = createAppStore({ enablePersistence: false })
    const storeB = createAppStore({ enablePersistence: false })

    render(
      <>
        <AppStoreProvider store={storeA}>
          <StoreIsolationProbe label="a" />
        </AppStoreProvider>
        <AppStoreProvider store={storeB}>
          <StoreIsolationProbe label="b" />
        </AppStoreProvider>
      </>,
    )

    expect(screen.getByTestId('a-group-count')).toHaveTextContent('0')
    expect(screen.getByTestId('b-group-count')).toHaveTextContent('0')

    fireEvent.click(screen.getByRole('button', { name: 'add-a' }))

    expect(screen.getByTestId('a-group-count')).toHaveTextContent('1')
    expect(screen.getByTestId('b-group-count')).toHaveTextContent('0')
  })

  it('sdk store blocks localStorage writes even when actions call save()', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

    render(
      <PromptEditorSDKStoreProvider>
        <SdkPersistenceProbe />
      </PromptEditorSDKStoreProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'trigger-save' }))

    await waitFor(() => {
      expect(screen.getByTestId('sdk-save-status')).toHaveTextContent('done')
    })

    expect(setItemSpy).not.toHaveBeenCalled()
    setItemSpy.mockRestore()
  })
})
