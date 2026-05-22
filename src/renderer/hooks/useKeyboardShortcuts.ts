import { useEffect } from 'react'
import { useAppStore } from '../stores/app-store'

export interface ShortcutCallbacks {
  addTerminal: (type?: 'shell' | 'opencode' | 'claude') => void
  closeTerminal: (id: string) => void
  exitFullscreen: () => void
  toggleBrowser: () => void
}

export function useKeyboardShortcuts(callbacks: ShortcutCallbacks) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && e.shiftKey && e.key === 'T') {
        e.preventDefault()
        callbacks.addTerminal('shell')
        return
      }

      if (ctrl && e.key === 'w') {
        if (isInput) return
        e.preventDefault()
        const state = useAppStore.getState()
        const project = state.currentProject
        if (project && project.terminals.length > 0) {
          const activeId = document.querySelector('.terminal-cell.active')?.getAttribute('data-term-id')
          const id = activeId || project.terminals[project.terminals.length - 1].id
          callbacks.closeTerminal(id)
        }
        return
      }

      if (ctrl && e.key === 'Tab') {
        if (isInput) return
        e.preventDefault()
        const state = useAppStore.getState()
        const project = state.currentProject
        if (!project || project.terminals.length < 2) return
        const activeId = document.querySelector('.terminal-cell.active')?.getAttribute('data-term-id')
        const idx = project.terminals.findIndex((t) => t.id === activeId)
        const next = project.terminals[(idx + 1) % project.terminals.length]
        const el = document.querySelector(`[data-term-id="${next.id}"]`) as HTMLElement
        el?.click()
        return
      }

      if (e.key === 'Escape') {
        if (isInput) return
        const state = useAppStore.getState()
        if (document.querySelector('.terminal-cell.fullscreen')) {
          callbacks.exitFullscreen()
          return
        }
        if (state.browserOpen) {
          callbacks.toggleBrowser()
          return
        }
        return
      }

      if (e.key === 'F11') {
        e.preventDefault()
        document.documentElement.requestFullscreen?.()
          .catch(() => document.exitFullscreen?.())
        return
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [callbacks])
}
