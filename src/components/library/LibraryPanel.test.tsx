import { render, screen, fireEvent, within } from '@testing-library/react';
import { LibraryPanel } from './LibraryPanel';
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

describe('LibraryPanel', () => {
  beforeEach(() => {
    useAppStore.setState({
      state: createInitialAppState(),
      sessionUi: createInitialSessionUiState(),
    });
    localStorage.clear();
  });

  it('should render and allow creating a group', async () => {
    render(
      <ToastProvider>
        <LibraryPanel />
      </ToastProvider>
    );

    expect(screen.getByText('暂无分组')).toBeInTheDocument();

    const newGroupBtn = screen.getByText('新建分组');
    fireEvent.click(newGroupBtn);

    const input = screen.getByPlaceholderText('分组名称...');
    fireEvent.change(input, { target: { value: 'Test Group' } });
    fireEvent.blur(input);

    expect(screen.getByText('Test Group')).toBeInTheDocument();
    
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should allow adding prompts to a group', async () => {
    render(
      <ToastProvider>
        <LibraryPanel />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('新建分组'));
    const groupInput = screen.getByPlaceholderText('分组名称...');
    fireEvent.change(groupInput, { target: { value: 'My Prompts' } });
    fireEvent.blur(groupInput);

    const addPromptBtns = screen.getAllByTitle('添加提示词');
    fireEvent.click(addPromptBtns[0]);

    const textarea = screen.getByPlaceholderText('输入内容...');
    fireEvent.change(textarea, { target: { value: 'Hello World' } });
    
    const saveBtn = screen.getByTitle('保存');
    fireEvent.click(saveBtn);
    
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('should filter prompts by search query', async () => {
    useAppStore.getState().createGroup({ area: 'library', name: 'Search Test' });
    const state = useAppStore.getState().state;
    const group = Object.values(state.library.groups)[0];
    useAppStore.getState().createPrompt({ area: 'library', groupId: group.id, content: 'Apple Pie' });
    useAppStore.getState().createPrompt({ area: 'library', groupId: group.id, content: 'Banana Bread' });

    render(
      <ToastProvider>
        <LibraryPanel />
      </ToastProvider>
    );

    expect(screen.getByText('Apple Pie')).toBeInTheDocument();
    expect(screen.getByText('Banana Bread')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('搜索提示词...');
    fireEvent.change(searchInput, { target: { value: 'Apple' } });

    const highlighted = screen.getByText('Apple');
    expect(highlighted).toHaveClass('bg-yellow-200');
    expect(screen.getByText('Pie')).toBeInTheDocument();
    
    expect(screen.queryByText('Banana Bread')).not.toBeInTheDocument();
  });

  it('should show affected count when deleting a group with prompts', async () => {
    useAppStore.getState().createGroup({ area: 'library', name: 'Delete Test' });
    const state = useAppStore.getState().state;
    const group = Object.values(state.library.groups).find(g => g.name === 'Delete Test');
    if (!group) throw new Error('Group not found');
    
    useAppStore.getState().createPrompt({ area: 'library', groupId: group.id, content: 'P1' });
    useAppStore.getState().createPrompt({ area: 'library', groupId: group.id, content: 'P2' });

    render(
      <ToastProvider>
        <LibraryPanel />
      </ToastProvider>
    );

    const groupElement = screen.getByTestId(`library-group-Delete Test`);
    const menuBtn = within(groupElement).getByTitle('菜单');
    fireEvent.click(menuBtn);

    const deleteBtn = screen.getByText('删除');
    fireEvent.click(deleteBtn);

    expect(screen.getByText('确认删除（将删除 2 条）')).toBeInTheDocument();
  });
});
