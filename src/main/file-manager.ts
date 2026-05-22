import { app, dialog, BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync, rmdirSync } from 'fs'

export type TerminalType = 'shell' | 'opencode' | 'claude'

export interface Terminal {
  id: string
  title: string
  cwd: string
  type: TerminalType
}

export interface Project {
  id: string
  name: string
  path: string
  terminals: Terminal[]
  layout: { cols: number; rows: number }
  createdAt: number
  updatedAt: number
}

const getDataDir = (): string => {
  const dataDir = join(app.getPath('home'), '.openspace')
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }
  return dataDir
}

const getProjectsDir = (): string => {
  const dir = join(getDataDir(), 'projects')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

const generateId = (): string => Math.random().toString(36).substring(2, 10)

const migrateTerminal = (t: any): Terminal => ({
  ...t,
  type: t.type ?? 'shell',
})

const migrateProject = (p: any): Project => ({
  ...p,
  terminals: (p.terminals || []).map(migrateTerminal),
  layout: p.layout || { cols: 1, rows: 1 },
})

// Config (last opened project)
export const getConfig = (): { lastProjectId?: string } => {
  const configPath = join(getDataDir(), 'config.json')
  if (existsSync(configPath)) {
    return JSON.parse(readFileSync(configPath, 'utf-8'))
  }
  return {}
}

export const saveConfig = (config: { lastProjectId?: string }): void => {
  const configPath = join(getDataDir(), 'config.json')
  writeFileSync(configPath, JSON.stringify(config, null, 2))
}

// Projects
export const listProjects = (): Project[] => {
  const projectsDir = getProjectsDir()
  const files = readdirSync(projectsDir).filter(f => f.endsWith('.json'))
  return files.map(f => {
    const data = readFileSync(join(projectsDir, f), 'utf-8')
    return migrateProject(JSON.parse(data))
  }).sort((a, b) => b.updatedAt - a.updatedAt)
}

export const createProject = (name: string, path: string): Project => {
  const id = generateId()
  const now = Date.now()
  const project: Project = {
    id, name, path,
    terminals: [],
    layout: { cols: 1, rows: 1 },
    createdAt: now, updatedAt: now,
  }
  const projectPath = join(getProjectsDir(), `${id}.json`)
  writeFileSync(projectPath, JSON.stringify(project, null, 2))
  return project
}

export const deleteProject = (id: string): void => {
  const projectPath = join(getProjectsDir(), `${id}.json`)
  if (existsSync(projectPath)) unlinkSync(projectPath)
}

export const renameProject = (id: string, name: string): Project | null => {
  const projectPath = join(getProjectsDir(), `${id}.json`)
  if (!existsSync(projectPath)) return null
  const project: Project = migrateProject(JSON.parse(readFileSync(projectPath, 'utf-8')))
  project.name = name
  project.updatedAt = Date.now()
  writeFileSync(projectPath, JSON.stringify(project, null, 2))
  return project
}

export const getProject = (id: string): Project | null => {
  const projectPath = join(getProjectsDir(), `${id}.json`)
  if (existsSync(projectPath)) {
    return migrateProject(JSON.parse(readFileSync(projectPath, 'utf-8')))
  }
  return null
}

export const saveProject = (project: Project): void => {
  const projectPath = join(getProjectsDir(), `${project.id}.json`)
  project.terminals = project.terminals.map(migrateTerminal)
  writeFileSync(projectPath, JSON.stringify(project, null, 2))
}

// Dialog
export const showSelectFolderDialog = (window: BrowserWindow): Promise<string | null> => {
  return dialog.showOpenDialog(window, {
    properties: ['openDirectory'],
    title: 'Select Project Folder'
  }).then(result => {
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })
}
