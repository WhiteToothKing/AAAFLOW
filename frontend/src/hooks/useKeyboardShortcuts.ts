import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SHORTCUTS: Record<string, string> = {
  'd': '/',          // Dashboard
  'n': '/create',    // New task
  'c': '/chat',      // Chat
  't': '/tasks',     // Tasks
  'w': '/wizard',    // Wizard
};

/**
 * Registers global Ctrl+Shift+<key> shortcuts for navigation.
 * Only fires when no input/textarea/contenteditable is focused.
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.shiftKey) return;

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      const key = e.key.toLowerCase();
      const path = SHORTCUTS[key];
      if (path) {
        e.preventDefault();
        navigate(path);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
}
