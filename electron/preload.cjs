"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Platform info
    getPlatform: () => electron_1.ipcRenderer.invoke('get-platform'),
    isElectron: true,
    // Window controls
    minimizeToTray: () => electron_1.ipcRenderer.invoke('minimize-to-tray'),
    // Notifications
    showNotification: (title, body) => electron_1.ipcRenderer.invoke('show-notification', { title, body }),
    // Event listeners for main process commands
    onQuickAddTask: (callback) => {
        electron_1.ipcRenderer.on('quick-add-task', callback);
        return () => electron_1.ipcRenderer.removeListener('quick-add-task', callback);
    },
    onSyncNow: (callback) => {
        electron_1.ipcRenderer.on('sync-now', callback);
        return () => electron_1.ipcRenderer.removeListener('sync-now', callback);
    },
});
