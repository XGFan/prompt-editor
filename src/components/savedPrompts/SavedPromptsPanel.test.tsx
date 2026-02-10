import { render, screen, fireEvent, act } from '@testing-library/react';
import { SavedPromptsPanel } from './SavedPromptsPanel';
import { useAppStore, createInitialAppState, createInitialSessionUiState } from '../../store/store';
import { ToastProvider } from '../ui/Toast';

const localStorageMock = (function() {
  let store: Record<string, string> = {};
  return {
    getItem: function(key: string) {
      return store[key] || null;
    },
    setItem: function(key: string, value: string) {
      store[key] = value.toString();
    },
    clear: function() {
      store = {};
    },
    removeItem: function(key: string) {
      delete store[key];
    }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('SavedPromptsPanel', () => {
  beforeEach(() => {
    useAppStore.setState({
      state: createInitialAppState(),
      sessionUi: createInitialSessionUiState(),
    });
    localStorage.clear();
  });

  it('renders empty state initially', () => {
    render(
      <ToastProvider>
        <SavedPromptsPanel />
      </ToastProvider>
    );
    expect(screen.getByTestId('saved-prompts-empty')).toBeInTheDocument();
    expect(screen.getByText('暂无成品')).toBeInTheDocument();
  });

  it('allows saving a prompt', () => {
    render(
      <ToastProvider>
        <SavedPromptsPanel />
      </ToastProvider>
    );

    const nameInput = screen.getByPlaceholderText('成品名称...');
    const tagsInput = screen.getByPlaceholderText('标签 (逗号分隔)');
    const saveBtn = screen.getByTestId('saved-prompts-save');

    fireEvent.change(nameInput, { target: { value: 'My Prompt' } });
    fireEvent.change(tagsInput, { target: { value: 'tag1, tag2' } });
    fireEvent.click(saveBtn);

    expect(screen.queryByTestId('saved-prompts-empty')).not.toBeInTheDocument();
    expect(screen.getByText('My Prompt')).toBeInTheDocument();
    expect(screen.getAllByText('tag1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('tag2').length).toBeGreaterThan(0);
  });

  it('prevents saving with empty name', () => {
    render(
      <ToastProvider>
        <SavedPromptsPanel />
      </ToastProvider>
    );

    const saveBtn = screen.getByTestId('saved-prompts-save');
    fireEvent.click(saveBtn);

    expect(screen.getByTestId('saved-prompts-empty')).toBeInTheDocument();
  });

  it('prevents saving duplicate name and shows error toast', async () => {
    render(
      <ToastProvider>
        <SavedPromptsPanel />
      </ToastProvider>
    );

    const nameInput = screen.getByPlaceholderText('成品名称...');
    const saveBtn = screen.getByTestId('saved-prompts-save');

    fireEvent.change(nameInput, { target: { value: 'Duplicate' } });
    fireEvent.click(saveBtn);

    // Try to save again with same name
    fireEvent.change(nameInput, { target: { value: 'Duplicate' } });
    fireEvent.click(saveBtn);

    const items = screen.getAllByText('Duplicate');
    expect(items.length).toBe(1);
    expect(await screen.findByText('saved prompts has duplicate name: Duplicate')).toBeInTheDocument();
  });

  it('allows saving with different case (case-sensitive)', async () => {
    render(
      <ToastProvider>
        <SavedPromptsPanel />
      </ToastProvider>
    );

    const nameInput = screen.getByPlaceholderText('成品名称...');
    const saveBtn = screen.getByTestId('saved-prompts-save');

    fireEvent.change(nameInput, { target: { value: 'Case' } });
    fireEvent.click(saveBtn);

    fireEvent.change(nameInput, { target: { value: 'case' } });
    fireEvent.click(saveBtn);

    expect(await screen.findByText('Case')).toBeInTheDocument();
    expect(await screen.findByText('case')).toBeInTheDocument();
  });

  it('prevents renaming to a duplicate name and shows error', async () => {
    render(
      <ToastProvider>
        <SavedPromptsPanel />
      </ToastProvider>
    );

    const nameInput = screen.getByPlaceholderText('成品名称...');
    const saveBtn = screen.getByTestId('saved-prompts-save');

    fireEvent.change(nameInput, { target: { value: 'Prompt A' } });
    fireEvent.click(saveBtn);
    fireEvent.change(nameInput, { target: { value: 'Prompt B' } });
    fireEvent.click(saveBtn);

    const itemA = await screen.findByText('Prompt A');
    fireEvent.click(itemA);

    const editInput = screen.getByPlaceholderText('输入名称');
    fireEvent.change(editInput, { target: { value: 'Prompt B' } });
    fireEvent.keyDown(editInput, { key: 'Enter', code: 'Enter' });

    expect(await screen.findByText('saved prompts has duplicate name: Prompt B')).toBeInTheDocument();
    // Prompt A should still be in the input field since rename failed
    expect(screen.getByDisplayValue('Prompt B')).toBeInTheDocument();
  });

  it('handles deletion confirmation timeout', async () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <SavedPromptsPanel />
      </ToastProvider>
    );

    const nameInput = screen.getByPlaceholderText('成品名称...');
    const saveBtn = screen.getByTestId('saved-prompts-save');
    fireEvent.change(nameInput, { target: { value: 'To Delete' } });
    fireEvent.click(saveBtn);

    const state = useAppStore.getState().state;
    const id = state.savedPrompts.order[0];
    const deleteBtn = screen.getByTestId(`saved-prompts-delete-${id}`);
    
    // First click -> Confirm mode
    fireEvent.click(deleteBtn);
    expect(screen.getByText('确认删除')).toBeInTheDocument();

    // Wait 3.1s
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });
    
    // Need to trigger a re-render or check after timers
    expect(screen.queryByText('确认删除')).not.toBeInTheDocument();
    
    vi.useRealTimers();
  });

  it('handles deletion confirmation cancellation via Escape', () => {
    render(
      <ToastProvider>
        <SavedPromptsPanel />
      </ToastProvider>
    );

    const nameInput = screen.getByPlaceholderText('成品名称...');
    const saveBtn = screen.getByTestId('saved-prompts-save');
    fireEvent.change(nameInput, { target: { value: 'To Cancel' } });
    fireEvent.click(saveBtn);

    const state = useAppStore.getState().state;
    const id = state.savedPrompts.order[0];
    const deleteBtn = screen.getByTestId(`saved-prompts-delete-${id}`);
    
    // First click -> Confirm mode
    fireEvent.click(deleteBtn);
    expect(screen.getByText('确认删除')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    
    expect(screen.queryByText('确认删除')).not.toBeInTheDocument();
  });

  it('allows loading a prompt into fragments (replaces existing)', () => {
    // Setup fragments with existing content
    useAppStore.setState({
      state: {
        ...createInitialAppState(),
        fragments: {
          groupOrder: ['old-g'],
          groups: { 'old-g': { id: 'old-g', name: 'Old Group', promptIds: [], collapsed: false } },
          prompts: {}
        },
        savedPrompts: {
          order: ['1'],
          items: {
            '1': { 
              id: '1', 
              name: 'New Prompt', 
              tags: [], 
              snapshot: {
                groupOrder: ['new-g'],
                groups: { 'new-g': { id: 'new-g', name: 'New Group', promptIds: [], collapsed: false } },
                prompts: {}
              }, 
              createdAt: '2025-01-01T00:00:00.000Z', 
              updatedAt: '2025-01-01T00:00:00.000Z' 
            },
          }
        }
      }
    });

    render(
      <ToastProvider>
        <SavedPromptsPanel />
      </ToastProvider>
    );

    const loadBtn = screen.getByTestId('saved-prompts-load-1');
    fireEvent.click(loadBtn);

    const state = useAppStore.getState().state;
    expect(state.fragments.groupOrder).toEqual(['new-g']);
    expect(state.fragments.groups['old-g']).toBeUndefined();
  });
});
