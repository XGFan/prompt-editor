import { render, screen, fireEvent } from '@testing-library/react';
import { LibraryItem } from './LibraryItem';
import { useAppStore, createInitialAppState, createInitialSessionUiState } from '../../store/store';
import { ToastProvider } from '../ui/Toast';
import type { PromptItem } from '../../domain/types';

describe('LibraryItem Highlighting', () => {
  const mockPrompt: PromptItem = {
    id: '1',
    content: 'Test content with (special) [characters] * . \\',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    useAppStore.setState({
      state: createInitialAppState(),
      sessionUi: createInitialSessionUiState(),
    });
  });

  it('should not crash with special characters in searchQuery', () => {
    const { rerender } = render(
      <ToastProvider>
        <LibraryItem prompt={mockPrompt} groupId="group-1" searchQuery="(" />
      </ToastProvider>
    );

    expect(screen.getByText('(')).toBeInTheDocument();
    expect(screen.getByText('(')).toHaveClass('bg-yellow-200');

    rerender(
      <ToastProvider>
        <LibraryItem prompt={mockPrompt} groupId="group-1" searchQuery="[" />
      </ToastProvider>
    );
    expect(screen.getByText('[')).toBeInTheDocument();
    expect(screen.getByText('[')).toHaveClass('bg-yellow-200');

    rerender(
      <ToastProvider>
        <LibraryItem prompt={mockPrompt} groupId="group-1" searchQuery="*" />
      </ToastProvider>
    );
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByText('*')).toHaveClass('bg-yellow-200');

    rerender(
      <ToastProvider>
        <LibraryItem prompt={mockPrompt} groupId="group-1" searchQuery="\" />
      </ToastProvider>
    );
    expect(screen.getByText('\\')).toBeInTheDocument();
    expect(screen.getByText('\\')).toHaveClass('bg-yellow-200');
  });

  it('should normalize content by replacing newlines with spaces during edit', () => {
    render(
      <ToastProvider>
        <LibraryItem prompt={mockPrompt} groupId="group-1" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTitle('编辑'));
    const textarea = screen.getByPlaceholderText('输入内容...') as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: 'Line 1\nLine 2' } });
    expect(textarea.value).toBe('Line 1 Line 2');
  });

  it('should save on Enter and handle single-line semantics', () => {
    const editPromptContent = vi.fn();
    useAppStore.setState({
      editPromptContent,
    });

    render(
      <ToastProvider>
        <LibraryItem prompt={mockPrompt} groupId="group-1" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTitle('编辑'));
    const textarea = screen.getByPlaceholderText('输入内容...');

    fireEvent.change(textarea, { target: { value: 'New Content' } });
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

    expect(editPromptContent).toHaveBeenCalledWith({
      area: 'library',
      promptId: mockPrompt.id,
      content: 'New Content',
    });
  });

  it('should delete existing prompt when saved content is blank', () => {
    const editPromptContent = vi.fn();
    const deletePrompt = vi.fn();
    useAppStore.setState({
      editPromptContent,
      deletePrompt,
    });

    render(
      <ToastProvider>
        <LibraryItem prompt={mockPrompt} groupId="group-1" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTitle('编辑'));
    const textarea = screen.getByPlaceholderText('输入内容...');

    fireEvent.change(textarea, { target: { value: '   ' } });
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });

    expect(deletePrompt).toHaveBeenCalledWith({
      area: 'library',
      groupId: 'group-1',
      promptId: mockPrompt.id,
    });
    expect(editPromptContent).not.toHaveBeenCalled();
  });

  it('should delete new empty prompt on cancel to avoid blank item', () => {
    const deletePrompt = vi.fn();
    const emptyPrompt: PromptItem = {
      ...mockPrompt,
      id: 'new-empty',
      content: '',
    };

    useAppStore.setState({
      deletePrompt,
    });

    render(
      <ToastProvider>
        <LibraryItem prompt={emptyPrompt} groupId="group-1" />
      </ToastProvider>
    );

    // 新建空项会自动进入编辑态，点击取消应直接删除该空项
    fireEvent.click(screen.getByTitle('取消'));

    expect(deletePrompt).toHaveBeenCalledWith({
      area: 'library',
      groupId: 'group-1',
      promptId: emptyPrompt.id,
    });
  });

  it('should save on Shift+Enter and not insert newline', () => {
    const editPromptContent = vi.fn();
    useAppStore.setState({
      editPromptContent,
    });

    render(
      <ToastProvider>
        <LibraryItem prompt={mockPrompt} groupId="group-1" />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTitle('编辑'));
    const textarea = screen.getByPlaceholderText('输入内容...') as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: 'Shift Enter Test' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(editPromptContent).toHaveBeenCalledWith({
      area: 'library',
      promptId: mockPrompt.id,
      content: 'Shift Enter Test',
    });
    expect(textarea.value).toBe('Shift Enter Test');
  });
});
