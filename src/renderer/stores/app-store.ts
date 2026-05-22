import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useToastStore } from './toast-store'

function notifyError(message: string) {
  useToastStore.getState().addToast(message, 'error')
}

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

type Screen = 'projects' | 'editor'

interface AppState {
  screen: Screen
  projects: Project[]
  currentProject: Project | null
  sidebarOpen: boolean
  browserOpen: boolean
  browserUrl: string
  panelWidth: number
  activeTerminalId: string
  _hasHydrated: boolean
  activePtyIds: Set<string>

  // Actions
  setScreen: (screen: Screen) => void
  loadProjects: () => Promise<void>
  createProject: () => Promise<void>
  deleteProject: (id: string) => Promise<void>
  renameProject: (id: string, name: string) => Promise<void>
  selectProject: (project: Project) => Promise<void>
  saveProject: (project: Project) => Promise<void>
  goBack: () => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  toggleBrowser: () => void
  setBrowserOpen: (open: boolean) => void
  setBrowserUrl: (url: string) => void
  setPanelWidth: (width: number) => void
  setActiveTerminalId: (id: string) => void
  addPtyId: (id: string) => void
  removePtyId: (id: string) => void
  hasPtyId: (id: string) => boolean
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
  _hasHydrated: false,
  screen: 'projects',
  projects: [],
  currentProject: null,
  sidebarOpen: true,
  browserOpen: false,
  browserUrl: 'https://google.com',
  panelWidth: 400,
  activeTerminalId: '',
  activePtyIds: new Set(),

  setScreen: (screen) => set({ screen }),

  loadProjects: async () => {
    try {
      const projects = await window.electronAPI.projects.list()
      set({ projects })
    } catch {
      notifyError('Failed to load projects')
    }
  },

  createProject: async () => {
    try {
      const folderPath = await window.electronAPI.dialog.selectFolder()
      if (!folderPath) return
      const name = folderPath.split(/[/\\]/).pop() || 'Project'
      const project = await window.electronAPI.projects.create(name, folderPath)
      set((state) => ({ projects: [project, ...state.projects] }))
    } catch {
      notifyError('Failed to create project')
    }
  },

  deleteProject: async (id: string) => {
    try {
      await window.electronAPI.projects.delete(id)
      set((state) => ({
        projects: state.projects.filter(p => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
        screen: state.currentProject?.id === id ? 'projects' : state.screen
      }))
    } catch {
      notifyError('Failed to delete project')
    }
  },

  renameProject: async (id: string, name: string) => {
    try {
      const project = await window.electronAPI.projects.rename(id, name)
      if (!project) return
      set((state) => ({
        projects: state.projects.map(p => p.id === id ? project : p),
        currentProject: state.currentProject?.id === id ? project : state.currentProject
      }))
    } catch {
      notifyError('Failed to rename project')
    }
  },

  selectProject: async (project) => {
    set({ currentProject: project, screen: 'editor' })
    await window.electronAPI.config.save({ lastProjectId: project.id })
  },

  saveProject: async (project) => {
    try {
      await window.electronAPI.projects.save(project)
      set((state) => ({
        projects: state.projects.map(p => p.id === project.id ? project : p),
        currentProject: state.currentProject?.id === project.id ? project : state.currentProject
      }))
    } catch {
      notifyError('Failed to save project')
    }
  },

  goBack: () => {
    set({ screen: 'projects', currentProject: null })
  },

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  toggleBrowser: () => set((s) => ({ browserOpen: !s.browserOpen })),

  setBrowserOpen: (open) => set({ browserOpen: open }),

  setBrowserUrl: (url) => set({ browserUrl: url }),

  setPanelWidth: (width) => set({ panelWidth: width }),

  setActiveTerminalId: (id) => set({ activeTerminalId: id }),

  addPtyId: (id) => {
    const ids = new Set(get().activePtyIds)
    ids.add(id)
    set({ activePtyIds: ids })
  },

  removePtyId: (id) => {
    const ids = new Set(get().activePtyIds)
    ids.delete(id)
    set({ activePtyIds: ids })
  },

  hasPtyId: (id) => get().activePtyIds.has(id),
    }),
    {
      name: 'openspace-ui',
      version: 1,
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        browserOpen: state.browserOpen,
        browserUrl: state.browserUrl,
        panelWidth: state.panelWidth,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.warn('[persist] hydration error:', error)
          }
          if (state) {
            useAppStore.setState({ _hasHydrated: true })
          }
        }
      },
    }
  )
)
