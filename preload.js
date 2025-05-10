const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getAuthUrl: () => ipcRenderer.invoke('get-auth-url'),
    onAuthSuccess: (callback) => ipcRenderer.on('auth-success', callback),
    onAuthError: (callback) => ipcRenderer.on('auth-error', callback)
});