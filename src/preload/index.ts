import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  // Terminal PTY
  pty: {
    spawn: (id: string, options?: { shell?: string; cols?: number; rows?: number; cwd?: string; command?: string }) =>
      ipcRenderer.send('pty:spawn', id, options),
    write: (id: string, data: string) =>
      ipcRenderer.send('pty:write', id, data),
    resize: (id: string, cols: number, rows: number) =>
      ipcRenderer.send('pty:resize', id, cols, rows),
    kill: (id: string) =>
      ipcRenderer.send('pty:kill', id),
    has: (id: string) =>
      ipcRenderer.invoke('pty:has', id),
    onData: (callback: (data: { id: string; data: string }) => void) => {
      const handler = (_event: any, payload: { id: string; data: string }) => callback(payload)
      ipcRenderer.on('pty:data', handler)
      return () => ipcRenderer.removeListener('pty:data', handler)
    },
    onExit: (callback: (data: { id: string; exitCode: number; signal?: number }) => void) => {
      const handler = (_event: any, payload: { id: string; exitCode: number; signal?: number }) => callback(payload)
      ipcRenderer.on('pty:exit', handler)
      return () => ipcRenderer.removeListener('pty:exit', handler)
    },
  },

  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizeChange: (callback: (maximized: boolean) => void) => {
      const handler = (_event: any, maximized: boolean) => callback(maximized)
      ipcRenderer.on('window:maximize-change', handler)
      return () => ipcRenderer.removeListener('window:maximize-change', handler)
    },
  },

  // App info
  app: {
    getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
    getVersions: () => ipcRenderer.invoke('app:getVersions'),
  },

  // Config
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    save: (config: any) => ipcRenderer.invoke('config:save', config),
  },

  // Projects
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    get: (id: string) => ipcRenderer.invoke('projects:get', id),
    create: (name: string, path: string) => ipcRenderer.invoke('projects:create', name, path),
    save: (project: any) => ipcRenderer.invoke('projects:save', project),
    delete: (id: string) => ipcRenderer.invoke('projects:delete', id),
    rename: (id: string, name: string) => ipcRenderer.invoke('projects:rename', id, name),
  },

  // Dialog
  dialog: {
    selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  },

  // Clipboard (for Ctrl+V paste in terminal)
  clipboard: {
    readText: () => ipcRenderer.invoke('clipboard:read-text'),
    writeText: (text: string) => ipcRenderer.invoke('clipboard:write-text', text),
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
