import { render, screen, fireEvent, within, act } from '@testing-library/react';
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

globalThis.ResizeObserver = class ResizeObserver {
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

    const newGroupBtn = screen.getByText('新建');
    fireEvent.click(newGroupBtn);

    const input = screen.getByPlaceholderText('分组名称...');
    fireEvent.change(input, { target: { value: 'Test Group' } });
    fireEvent.blur(input);

    expect(screen.getAllByText('Test Group')[0]).toBeInTheDocument();
    expect(screen.getAllByText('0')[0]).toBeInTheDocument();
  });

  it('should allow adding prompts to a group', async () => {
    render(
      <ToastProvider>
        <LibraryPanel />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('新建'));
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

    const searchInput = screen.getByPlaceholderText(/搜索 Search Test/);
    fireEvent.change(searchInput, { target: { value: 'Apple' } });

    const highlighted = screen.getByText('Apple');
    expect(highlighted).toHaveClass('bg-yellow-200');
    expect(screen.getByText('Pie')).toBeInTheDocument();
    
    expect(screen.queryByText('Banana Bread')).not.toBeInTheDocument();
  });

  it.skip('should show affected count when deleting a group with prompts', async () => {
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
    // Hack: make button clickable in JSDOM despite parent pointer-events-none
    menuBtn.style.pointerEvents = 'auto';
    fireEvent.click(menuBtn);

    const deleteBtn = screen.getByText('删除');
    deleteBtn.style.pointerEvents = 'auto';
    fireEvent.click(deleteBtn);

    expect(screen.getByText('确认删除（将删除 2 条）')).toBeInTheDocument();
  });

  describe('竖排 Tab 分组', () => {
    it('切换 tab 时仅展示当前分组内容', () => {
      const store = useAppStore.getState();
      store.createGroup({ area: 'library', name: '组 A' });
      store.createGroup({ area: 'library', name: '组 B' });

      const libraryState = useAppStore.getState().state.library;
      const groupA = Object.values(libraryState.groups).find((g) => g.name === '组 A');
      const groupB = Object.values(libraryState.groups).find((g) => g.name === '组 B');
      if (!groupA || !groupB) throw new Error('测试分组创建失败');

      store.createPrompt({ area: 'library', groupId: groupA.id, content: 'A-提示-1' });
      store.createPrompt({ area: 'library', groupId: groupA.id, content: 'A-提示-2' });
      store.createPrompt({ area: 'library', groupId: groupB.id, content: 'B-提示-1' });

      render(
        <ToastProvider>
          <LibraryPanel />
        </ToastProvider>
      );

      const tabA = screen.getByTestId(`library-tab-${groupA.id}`);
      const tabB = screen.getByTestId(`library-tab-${groupB.id}`);
      fireEvent.click(tabA);

      const panelA = screen.getByRole('tabpanel');
      expect(within(panelA).getByText('A-提示-1')).toBeInTheDocument();
      expect(within(panelA).getByText('A-提示-2')).toBeInTheDocument();
      expect(within(panelA).queryByText('B-提示-1')).not.toBeInTheDocument();

      fireEvent.click(tabB);

      const panelB = screen.getByRole('tabpanel');
      expect(within(panelB).getByText('B-提示-1')).toBeInTheDocument();
      expect(within(panelB).queryByText('A-提示-1')).not.toBeInTheDocument();
      expect(within(panelB).queryByText('A-提示-2')).not.toBeInTheDocument();
    });

    it('tab 上显示分组内条目数量', () => {
      const store = useAppStore.getState();
      store.createGroup({ area: 'library', name: '计数组' });

      const group = Object.values(useAppStore.getState().state.library.groups).find((g) => g.name === '计数组');
      if (!group) throw new Error('计数组创建失败');

      store.createPrompt({ area: 'library', groupId: group.id, content: '计数-1' });
      store.createPrompt({ area: 'library', groupId: group.id, content: '计数-2' });
      store.createPrompt({ area: 'library', groupId: group.id, content: '计数-3' });

      render(
        <ToastProvider>
          <LibraryPanel />
        </ToastProvider>
      );

      const tab = screen.getByTestId(`library-tab-${group.id}`);
      expect(within(tab).getByText('3')).toBeInTheDocument();
    });

    it('激活分组可持久化并在重新渲染后恢复', () => {
      const store = useAppStore.getState();
      store.createGroup({ area: 'library', name: '恢复 A' });
      store.createGroup({ area: 'library', name: '恢复 B' });

      const libraryState = useAppStore.getState().state.library;
      const groupA = Object.values(libraryState.groups).find((g) => g.name === '恢复 A');
      const groupB = Object.values(libraryState.groups).find((g) => g.name === '恢复 B');
      if (!groupA || !groupB) throw new Error('恢复测试分组创建失败');

      const { rerender } = render(
        <ToastProvider>
          <LibraryPanel />
        </ToastProvider>
      );

      const tabB = screen.getByTestId(`library-tab-${groupB.id}`);
      fireEvent.click(tabB);
      expect(tabB).toHaveAttribute('aria-selected', 'true');

      rerender(
        <ToastProvider>
          <LibraryPanel />
        </ToastProvider>
      );

      const restoredTabB = screen.getByTestId(`library-tab-${groupB.id}`);
      expect(restoredTabB).toHaveAttribute('aria-selected', 'true');

      const restoredPanel = screen.getByRole('tabpanel');
      expect(restoredPanel).toBeInTheDocument();
    });

    it('删除当前激活分组后自动回退到首个可用分组', () => {
      const store = useAppStore.getState();
      store.createGroup({ area: 'library', name: '回退 A' });
      store.createGroup({ area: 'library', name: '回退 B' });

      const libraryState = useAppStore.getState().state.library;
      const groupA = Object.values(libraryState.groups).find((g) => g.name === '回退 A');
      const groupB = Object.values(libraryState.groups).find((g) => g.name === '回退 B');
      if (!groupA || !groupB) throw new Error('回退测试分组创建失败');

      store.createPrompt({ area: 'library', groupId: groupA.id, content: '回退-A-内容' });
      store.createPrompt({ area: 'library', groupId: groupB.id, content: '回退-B-内容' });

      render(
        <ToastProvider>
          <LibraryPanel />
        </ToastProvider>
      );

      const tabB = screen.getByTestId(`library-tab-${groupB.id}`);
      fireEvent.click(tabB);
      expect(tabB).toHaveAttribute('aria-selected', 'true');

      act(() => {
        useAppStore.getState().deleteGroup({ area: 'library', groupId: groupB.id });
      });

      const tabA = screen.getByTestId(`library-tab-${groupA.id}`);
      expect(tabA).toHaveAttribute('aria-selected', 'true');

      const panel = screen.getByRole('tabpanel');
      expect(within(panel).getByText('回退-A-内容')).toBeInTheDocument();
      expect(within(panel).queryByText('回退-B-内容')).not.toBeInTheDocument();
    });
  });
});
