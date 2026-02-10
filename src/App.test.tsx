import { render, screen } from '@testing-library/react'
import App from './App'
import { createInitialAppState, createInitialSessionUiState, useAppStore } from './store/store'

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

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    useAppStore.setState({
      state: createInitialAppState(),
      sessionUi: createInitialSessionUiState(),
    });
    localStorage.clear();
  });

  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByText('片段区')).toBeInTheDocument()
  })

  it('sdkDemo=1 时渲染宿主集成示例页', () => {
    window.history.replaceState({}, '', '/?sdkDemo=1');
    render(<App />);
    expect(screen.getByTestId('host-open-editor')).toBeInTheDocument();
    expect(screen.queryByText('片段区')).not.toBeInTheDocument();
  });
})
