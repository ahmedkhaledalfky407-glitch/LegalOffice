const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsAPI', {
    getConfig: () => ipcRenderer.invoke('get-config'),
    setSource: (source) => ipcRenderer.invoke('set-source', source),
    close: () => ipcRenderer.invoke('close-settings'),
    reload: () => ipcRenderer.invoke('reload-app'),
    devtools: () => ipcRenderer.invoke('open-devtools'),
});