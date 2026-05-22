import { ipcMain, BrowserWindow, clipboard } from 'electron'
import { PtyManager } from './pty-manager'
import * as fileManager from './file-manager'

const ptyManager = new PtyManager()

export function registerIpcHandlers(): void {
  ipcMain.on('pty:spawn', async (event, id: string, options?: any) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    await ptyManager.spawn(id, win, options)
  })

  ipcMain.on('pty:write', (_event, id: string, data: string) => {
    ptyManager.write(id, data)
  })

  ipcMain.on('pty:resize', (_event, id: string, cols: number, rows: number) => {
    ptyManager.resize(id, cols, rows)
  })

  ipcMain.on('pty:kill', (_event, id: string) => {
    ptyManager.kill(id)
  })

  ipcMain.handle('pty:has', (_event, id: string) => {
    return ptyManager.has(id)
  })

  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) win.unmaximize()
    else win?.maximize()
  })

  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.handle('window:isMaximized', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
  })

  ipcMain.handle('app:getPlatform', () => process.platform)
  ipcMain.handle('app:getVersions', () => ({
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  }))

  ipcMain.handle('config:get', () => fileManager.getConfig())
  ipcMain.handle('config:save', (_event, config) => fileManager.saveConfig(config))

  ipcMain.handle('projects:list', () => fileManager.listProjects())
  ipcMain.handle('projects:get', (_event, id: string) => fileManager.getProject(id))
  ipcMain.handle('projects:create', (_event, name: string, path: string) => fileManager.createProject(name, path))
  ipcMain.handle('projects:save', (_event, project) => fileManager.saveProject(project))
  ipcMain.handle('projects:delete', (_event, id: string) => fileManager.deleteProject(id))
  ipcMain.handle('projects:rename', (_event, id: string, name: string) => fileManager.renameProject(id, name))

  ipcMain.handle('dialog:selectFolder', async () => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return null
    return fileManager.showSelectFolderDialog(win)
  })

  ipcMain.handle('clipboard:read-text', () => {
    return clipboard.readText()
  })
  ipcMain.handle('clipboard:write-text', (_event, text) => {
    clipboard.writeText(text)
  })
}