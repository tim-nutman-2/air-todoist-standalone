// Electron integration utilities

export interface ElectronAPI {
  getPlatform: () => Promise<NodeJS.Platform>;
  isElectron: boolean;
  minimizeToTray: () => Promise<void>;
  showNotification: (title: string, body: string) => Promise<void>;
  onQuickAddTask: (callback: () => void) => () => void;
  onSyncNow: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

/**
 * Check if running in Electron
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
}

/**
 * Get the Electron API (returns null if not in Electron)
 */
export function getElectronAPI(): ElectronAPI | null {
  if (isElectron()) {
    return window.electronAPI!;
  }
  return null;
}

/**
 * Show a native notification (falls back to browser notification if not in Electron)
 */
export async function showNativeNotification(title: string, body: string): Promise<void> {
  const api = getElectronAPI();
  
  if (api) {
    await api.showNotification(title, body);
  } else if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification(title, { body });
    }
  }
}

/**
 * Minimize to system tray (only works in Electron)
 */
export async function minimizeToTray(): Promise<void> {
  const api = getElectronAPI();
  if (api) {
    await api.minimizeToTray();
  }
}
