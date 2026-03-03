import { useEffect } from 'react';
import { isElectron, getElectronAPI } from '../utils/electron';

interface UseElectronOptions {
  onQuickAddTask?: () => void;
  onSyncNow?: () => void;
}

/**
 * Hook to handle Electron-specific events and functionality
 */
export function useElectron({ onQuickAddTask, onSyncNow }: UseElectronOptions = {}) {
  useEffect(() => {
    if (!isElectron()) return;

    const api = getElectronAPI();
    if (!api) return;

    const cleanups: (() => void)[] = [];

    // Register quick add task handler
    if (onQuickAddTask) {
      const cleanup = api.onQuickAddTask(onQuickAddTask);
      cleanups.push(cleanup);
    }

    // Register sync now handler
    if (onSyncNow) {
      const cleanup = api.onSyncNow(onSyncNow);
      cleanups.push(cleanup);
    }

    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  }, [onQuickAddTask, onSyncNow]);

  return {
    isElectron: isElectron(),
  };
}
