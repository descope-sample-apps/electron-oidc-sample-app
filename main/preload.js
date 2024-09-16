const { contextBridge, ipcRenderer } = require("electron");

// API Definition
const electronAPI = {
  getProfile: () => ipcRenderer.invoke('auth:get-profile'),
  goAuthPage: (flowParam) => ipcRenderer.send('auth:go-auth-url', flowParam),
  logOut: () => ipcRenderer.send('auth:log-out'),
  validate: () => ipcRenderer.invoke('auth:validate'),
};

// Register the API with the contextBridge
process.once("loaded", () => {
  contextBridge.exposeInMainWorld('electronAPI', electronAPI);
});