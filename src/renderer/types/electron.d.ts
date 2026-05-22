export interface ElectronAPI {
  pty: {
    spawn: (id: string, options?: { shell?: string; cols?: number; rows?: number; cwd?: string; command?: string }) => void
    write: (id: string, data: string) => void
    resize: (id: string, cols: number, rows: number) => void
    kill: (id: string) => void
    has: (id: string) => Promise<boolean>
    onData: (callback: (data: { id: string; data: string }) => void) => () => void
    onExit: (callback: (data: { id: string; exitCode: number; signal?: number }) => void) => () => void
  }
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
    isMaximized: () => Promise<boolean>
    onMaximizeChange: (callback: (maximized: boolean) => void) => () => void
  }
  app: {
    getPlatform: () => Promise<string>
    getVersions: () => Promise<{ electron: string; chrome: string; node: string }>
  }
  config: {
    get: () => Promise<any>
    save: (config: any) => Promise<void>
  }
  projects: {
    list: () => Promise<any[]>
    get: (id: string) => Promise<any>
    create: (name: string, path: string) => Promise<any>
    save: (project: any) => Promise<void>
    delete: (id: string) => Promise<void>
    rename: (id: string, name: string) => Promise<any>
  }
  dialog: {
    selectFolder: () => Promise<string | null>
  }
  clipboard: {
    readText: () => Promise<string>
    writeText: (text: string) => Promise<void>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}


