import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  isElectron: true,

  // Window controls
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),

  // Notifications
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('show-notification', { title, body }),

  // Event listeners for main process commands
  onQuickAddTask: (callback: () => void) => {
    ipcRenderer.on('quick-add-task', callback);
    return () => ipcRenderer.removeListener('quick-add-task', callback);
  },

  onSyncNow: (callback: () => void) => {
    ipcRenderer.on('sync-now', callback);
    return () => ipcRenderer.removeListener('sync-now', callback);
  },
});

// Type definitions for the exposed API
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
