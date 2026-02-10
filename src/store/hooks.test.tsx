import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppStoreProvider } from './provider'
import { createAppStore, createInitialAppState, createInitialSessionUiState, useAppStore } from './store'
import { useAppStoreSelector } from './hooks'

function StoreSelectorProbe({ label }: { label: string }) {
  const groupCount = useAppStoreSelector((store) => store.state.library.groupOrder.length)
  const createGroup = useAppStoreSelector((store) => store.createGroup)

  return (
    <section>
      <div data-testid={`${label}-group-count`}>{groupCount}</div>
      <button onClick={() => createGroup({ area: 'library', name: `${label}-group` })}>add-{label}</button>
    </section>
  )
}

describe('useAppStoreSelector', () => {
  it('falls back to singleton store without provider', () => {
    useAppStore.setState({
      state: createInitialAppState(),
      sessionUi: createInitialSessionUiState(),
    })

    render(<StoreSelectorProbe label="singleton" />)

    expect(screen.getByTestId('singleton-group-count')).toHaveTextContent('0')
    fireEvent.click(screen.getByRole('button', { name: 'add-singleton' }))
    expect(screen.getByTestId('singleton-group-count')).toHaveTextContent('1')
    expect(useAppStore.getState().state.library.groupOrder).toHaveLength(1)
  })

  it('uses injected provider store when context exists', () => {
    useAppStore.setState({
      state: createInitialAppState(),
      sessionUi: createInitialSessionUiState(),
    })
    const injectedStore = createAppStore({ enablePersistence: false })

    render(
      <AppStoreProvider store={injectedStore}>
        <StoreSelectorProbe label="context" />
      </AppStoreProvider>,
    )

    expect(screen.getByTestId('context-group-count')).toHaveTextContent('0')
    fireEvent.click(screen.getByRole('button', { name: 'add-context' }))
    expect(screen.getByTestId('context-group-count')).toHaveTextContent('1')

    expect(injectedStore.getState().state.library.groupOrder).toHaveLength(1)
    expect(useAppStore.getState().state.library.groupOrder).toHaveLength(0)
  })
})
