const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('chordloomDesktop', {
  prepare: request => ipcRenderer.invoke('chordloom:prepare', request),
  reveal: id => ipcRenderer.invoke('chordloom:reveal', id),
  drag: ids => ipcRenderer.send('chordloom:drag', ids),
  onDragStatus: handler => {
    const listener = (_event, message) => handler(message);
    ipcRenderer.on('chordloom:drag-status', listener);
    return () => ipcRenderer.removeListener('chordloom:drag-status', listener);
  }
});
