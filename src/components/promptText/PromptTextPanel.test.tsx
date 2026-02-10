import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromptTextPanel } from './PromptTextPanel';
import * as hooks from '../../store/hooks';

// Mock dependencies
vi.mock('../../store/hooks', () => ({
  useAppStoreSelector: vi.fn(),
}));

vi.mock('../ui/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe('PromptTextPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteText.mockResolvedValue(undefined);
  });

  it('renders default markdown format', () => {
    vi.spyOn(hooks, 'useAppStoreSelector').mockReturnValue({
      groups: {
        'g1': { id: 'g1', name: 'Group 1', promptIds: ['p1'] }
      },
      prompts: {
        'p1': { id: 'p1', content: 'hello' }
      },
      groupOrder: ['g1']
    });

    render(<PromptTextPanel />);

    // Check for tabs
    expect(screen.getByTestId('prompt-text-format-markdown')).toBeInTheDocument();
    expect(screen.getByTestId('prompt-text-format-yaml')).toBeInTheDocument();
    expect(screen.getByTestId('prompt-text-format-xml')).toBeInTheDocument();

    // Check default content (Markdown)
    const textPanel = screen.getByTestId('prompt-text');
    expect(textPanel).toHaveTextContent('##Group 1');
    expect(textPanel).toHaveTextContent('hello');
  });

  it('switches format and updates text content', () => {
    vi.spyOn(hooks, 'useAppStoreSelector').mockReturnValue({
      groups: {
        'g1': { id: 'g1', name: 'Group 1', promptIds: ['p1'] }
      },
      prompts: {
        'p1': { id: 'p1', content: 'hello' }
      },
      groupOrder: ['g1']
    });

    render(<PromptTextPanel />);

    // Switch to YAML
    fireEvent.click(screen.getByTestId('prompt-text-format-yaml'));
    const textPanel = screen.getByTestId('prompt-text');
    
    // YAML format expectation (Group 1:\n  - hello;)
    expect(textPanel).toHaveTextContent('Group 1:');
    expect(textPanel).toHaveTextContent('- hello;');

    // Switch to XML
    fireEvent.click(screen.getByTestId('prompt-text-format-xml'));
    
    // XML format expectation (<group name="Group 1">\n    <snippet>hello;</snippet>)
    expect(textPanel).toHaveTextContent('<prompts>');
    expect(textPanel).toHaveTextContent('<group name="Group 1">');
    expect(textPanel).toHaveTextContent('<snippet>hello;</snippet>');
  });

  it('copies content in current format', async () => {
    vi.spyOn(hooks, 'useAppStoreSelector').mockReturnValue({
      groups: {
        'g1': { id: 'g1', name: 'Group 1', promptIds: ['p1'] }
      },
      prompts: {
        'p1': { id: 'p1', content: 'hello' }
      },
      groupOrder: ['g1']
    });

    render(<PromptTextPanel />);

    // Switch to YAML
    fireEvent.click(screen.getByTestId('prompt-text-format-yaml'));

    // Click copy
    const copyButton = screen.getByTestId('prompt-text-copy');
    fireEvent.click(copyButton);

    expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('Group 1:'));
    expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('- hello;'));
  });
});
