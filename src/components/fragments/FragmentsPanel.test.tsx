import { render, screen, fireEvent } from '@testing-library/react';
import { FragmentsPanel } from './FragmentsPanel';
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

describe('FragmentsPanel', () => {
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
        <FragmentsPanel />
      </ToastProvider>
    );

    expect(screen.getByText('暂无分组')).toBeInTheDocument();

    const newGroupBtns = screen.getAllByText('新建分组');
    fireEvent.click(newGroupBtns[0]);

    const input = screen.getByPlaceholderText('分组名称...');
    fireEvent.change(input, { target: { value: 'Test Group' } });
    fireEvent.blur(input);

    expect(screen.getByText('Test Group')).toBeInTheDocument();
    
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should allow adding prompts to a group', async () => {
    render(
      <ToastProvider>
        <FragmentsPanel />
      </ToastProvider>
    );

    const newGroupBtns = screen.getAllByText('新建分组');
    fireEvent.click(newGroupBtns[0]);
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

  it('should reflect changes when prompt is added from library', async () => {
    useAppStore.getState().createGroup({ area: 'library', name: 'LibGroup' });
    let libState = useAppStore.getState().state.library;
    const libGroupId = libState.groupOrder[0];
    useAppStore.getState().createPrompt({ area: 'library', groupId: libGroupId, content: 'Library Content' });
    
    libState = useAppStore.getState().state.library;
    const libPromptId = libState.groups[libGroupId].promptIds[0];

    useAppStore.getState().addLibraryPromptToFragments({ libraryPromptId: libPromptId, libraryGroupId: libGroupId });

    render(
      <ToastProvider>
        <FragmentsPanel />
      </ToastProvider>
    );

    expect(screen.getByText('LibGroup')).toBeInTheDocument();
    expect(screen.getByText('Library Content')).toBeInTheDocument();
  });

  it('should not keep blank prompt when creating and saving empty content', async () => {
    render(
      <ToastProvider>
        <FragmentsPanel />
      </ToastProvider>
    );

    const newGroupBtns = screen.getAllByText('新建分组');
    fireEvent.click(newGroupBtns[0]);
    const groupInput = screen.getByPlaceholderText('分组名称...');
    fireEvent.change(groupInput, { target: { value: 'Blank Group' } });
    fireEvent.blur(groupInput);

    const addPromptBtns = screen.getAllByTitle('添加提示词');
    fireEvent.click(addPromptBtns[0]);

    const textarea = screen.getByPlaceholderText('输入内容...');
    fireEvent.change(textarea, { target: { value: '   ' } });
    const saveBtn = screen.getByTitle('保存');
    fireEvent.click(saveBtn);

    const currentState = useAppStore.getState().state;
    const group = Object.values(currentState.fragments.groups).find(g => g.name === 'Blank Group');
    expect(group).toBeDefined();
    expect(group?.promptIds).toHaveLength(0);
  });

  it('should delete existing prompt when edited to blank and saved', async () => {
    useAppStore.getState().createGroup({ area: 'fragments', name: 'Edit Blank' });
    const state = useAppStore.getState().state;
    const group = Object.values(state.fragments.groups).find(g => g.name === 'Edit Blank');
    if (!group) throw new Error('Group not found');
    useAppStore.getState().createPrompt({ area: 'fragments', groupId: group.id, content: 'To Delete' });

    render(
      <ToastProvider>
        <FragmentsPanel />
      </ToastProvider>
    );

    const item = screen.getByText('To Delete');
    fireEvent.click(item);
    const editBtn = screen.getByTitle('编辑');
    fireEvent.click(editBtn);

    const textarea = screen.getByPlaceholderText('输入内容...');
    fireEvent.change(textarea, { target: { value: ' ' } });
    const saveBtn = screen.getByTitle('保存');
    fireEvent.click(saveBtn);

    expect(screen.queryByText('To Delete')).not.toBeInTheDocument();

    const nextState = useAppStore.getState().state;
    const nextGroup = nextState.fragments.groups[group.id];
    expect(nextGroup.promptIds).toHaveLength(0);
  });
});
