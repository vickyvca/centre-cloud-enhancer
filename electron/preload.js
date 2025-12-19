const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  
  // Auth
  login: (email, password) => ipcRenderer.invoke('auth:login', email, password),
  register: (email, password, username, fullName) => ipcRenderer.invoke('auth:register', email, password, username, fullName),
  getProfile: (userId) => ipcRenderer.invoke('auth:getProfile', userId),
  updateProfile: (userId, updates) => ipcRenderer.invoke('auth:updateProfile', userId, updates),
  
  // License
  getHWID: () => ipcRenderer.invoke('license:getHWID'),
  checkLicense: () => ipcRenderer.invoke('license:check'),
  activateLicense: (key) => ipcRenderer.invoke('license:activate', key),
  
  // Database operations
  db: {
    select: (table, where, orderBy) => ipcRenderer.invoke('db:select', table, where, orderBy),
    selectOne: (table, where) => ipcRenderer.invoke('db:selectOne', table, where),
    insert: (table, data) => ipcRenderer.invoke('db:insert', table, data),
    update: (table, data, where) => ipcRenderer.invoke('db:update', table, data, where),
    delete: (table, where) => ipcRenderer.invoke('db:delete', table, where),
    query: (sql, params) => ipcRenderer.invoke('db:query', sql, params),
    run: (sql, params) => ipcRenderer.invoke('db:run', sql, params),
  },
  
  // Users management
  users: {
    list: () => ipcRenderer.invoke('users:list'),
    updateRole: (userId, role) => ipcRenderer.invoke('users:updateRole', userId, role),
    delete: (userId) => ipcRenderer.invoke('users:delete', userId),
  },
});
