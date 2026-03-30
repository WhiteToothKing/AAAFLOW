const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gameartDesktop', {
  isDesktop: true,
  notifyGenerationDone: (title, body) => ipcRenderer.send('aaaflow:notify-generation-done', title, body),
  minimize: () => ipcRenderer.send('aaaflow:minimize'),
  maximize: () => ipcRenderer.send('aaaflow:maximize'),
  closeWindow: () => ipcRenderer.send('aaaflow:close'),
  isMaximized: () => ipcRenderer.invoke('aaaflow:is-maximized'),
  onMaximizeChanged: (cb) => {
    ipcRenderer.on('aaaflow:maximize-changed', (_, val) => cb(val));
    return () => ipcRenderer.removeAllListeners('aaaflow:maximize-changed');
  },
  installUpdate: () => ipcRenderer.send('aaaflow:install-update'),
  onUpdateAvailable: (cb) => {
    ipcRenderer.on('aaaflow:update-available', (_, ver) => cb(ver));
  },
  onUpdateDownloaded: (cb) => {
    ipcRenderer.on('aaaflow:update-downloaded', (_, ver) => cb(ver));
  },
});

/** 与主界面同源：启动后台页（#/bootstrap）通过 React + Ant Design 调用 */
contextBridge.exposeInMainWorld('aaaflowLauncher', {
  getRepoRoot: () => ipcRenderer.invoke('aaaflow:getRepoRoot'),
  checkHealth: () => ipcRenderer.invoke('aaaflow:checkHealth'),
  tryOpenMain: () => ipcRenderer.invoke('aaaflow:try-open-main'),
  ensureEnv: () => ipcRenderer.invoke('aaaflow:ensureEnv'),
  startDocker: () => ipcRenderer.send('aaaflow:start-docker'),
  openEnvFile: () => ipcRenderer.invoke('aaaflow:open-env'),
  openRepoFolder: () => ipcRenderer.invoke('aaaflow:open-repo'),
  openMirrorHelp: () => ipcRenderer.invoke('aaaflow:open-mirror-help'),
  onDockerLog: (cb) => {
    const fn = (_, text) => cb(text);
    ipcRenderer.on('aaaflow:docker-log', fn);
    return () => ipcRenderer.removeListener('aaaflow:docker-log', fn);
  },
  onDockerDone: (cb) => {
    const fn = (_, code) => cb(code);
    ipcRenderer.on('aaaflow:docker-done', fn);
    return () => ipcRenderer.removeListener('aaaflow:docker-done', fn);
  },
});
