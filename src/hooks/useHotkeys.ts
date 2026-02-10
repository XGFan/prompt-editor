import { useEffect } from 'react';

type KeyCombo = string;

export function useHotkeys(
  keyCombo: KeyCombo, 
  callback: (e: KeyboardEvent) => void, 
  deps: any[] = []
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keys = keyCombo.toLowerCase().split('+');
      const key = keys.pop();
      
      const meta = keys.includes('meta') || keys.includes('cmd') || keys.includes('command');
      const ctrl = keys.includes('ctrl') || keys.includes('control');
      const shift = keys.includes('shift');
      const alt = keys.includes('alt') || keys.includes('option');
      
      const metaPressed = e.metaKey;
      const ctrlPressed = e.ctrlKey;
      const shiftPressed = e.shiftKey;
      const altPressed = e.altKey;
      
      const target = e.target as HTMLElement;
      if (target.matches('input, textarea, [contenteditable="true"]')) return;
      
      if (meta && !metaPressed) return;
      if (ctrl && !ctrlPressed) return;
      if (shift && !shiftPressed) return;
      if (alt && !altPressed) return;
      
      if (e.key.toLowerCase() === key) {
        callback(e);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyCombo, callback, ...deps]);
}
