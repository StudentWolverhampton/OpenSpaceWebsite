import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useAppStore, Project, Terminal, TerminalType } from '../stores/app-store'
import { useTerminal } from '../components/Terminal/useTerminal'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { ConfirmDialog } from '../components/ConfirmDialog/ConfirmDialog'
import './Screens.css'
import '@xterm/xterm/css/xterm.css'

const typeIcon: Record<TerminalType, string> = {
  shell: '>_',
  opencode: 'oc',
  claude: 'cl',
}

const generateId = () => Math.random().toString(36).substring(2, 10)

const TerminalCell: React.FC<{
  terminal: Terminal
  cwd: string
  isActive: boolean
  isFullscreen: boolean
  isHidden: boolean
  onClick: () => void
  onClose: () => void
  onFullscreen: () => void
}> = ({
  terminal, cwd, isActive, isFullscreen, isHidden,
  onClick, onClose, onFullscreen,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { initTerminal } = useTerminal({ id: terminal.id, cwd, type: terminal.type })

  useEffect(() => {
    if (containerRef.current) {
      initTerminal(containerRef.current)
    }
  }, [initTerminal])

  return (
    <div
      data-term-id={terminal.id}
      className={`terminal-cell ${isActive ? 'active' : ''} ${isFullscreen ? 'fullscreen' : ''} ${isHidden ? 'terminal-hidden' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter') {
          e.preventDefault()
          onClick()
        }
      }}
      aria-label={`Terminal: ${terminal.title}`}
    >
      <div className="terminal-cell-header">
        <span className="terminal-cell-title">
          <span className={`terminal-type-badge ${terminal.type}`}>{typeIcon[terminal.type]}</span>
          {terminal.title}
        </span>
        <div className="terminal-cell-actions">
          <button
            className="terminal-cell-fullscreen"
            onClick={(e) => { e.stopPropagation(); onFullscreen() }}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            aria-label={isFullscreen ? `Exit fullscreen ${terminal.title}` : `Fullscreen ${terminal.title}`}
          >
            {isFullscreen ? (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M4 1V4H1M8 1V4H11M4 11V8H1M8 11V8H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M1 4V1H4M8 1H11V4M11 8V11H8M4 11H1V8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <button
            className="terminal-cell-close"
            onClick={(e) => { e.stopPropagation(); onClose() }}
            aria-label={`Close ${terminal.title}`}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="terminal-cell-body">
        <div ref={containerRef} className="terminal-container-inner" />
      </div>
    </div>
  )
}

export const Editor: React.FC = () => {
  const currentProject = useAppStore((s) => s.currentProject)
  const saveProject = useAppStore((s) => s.saveProject)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const toggleBrowser = useAppStore((s) => s.toggleBrowser)
  const browserOpen = useAppStore((s) => s.browserOpen)
  const activeTerminalId = useAppStore((s) => s.activeTerminalId)
  const setActiveTerminalId = useAppStore((s) => s.setActiveTerminalId)
  const hasPtyId = useAppStore((s) => s.hasPtyId)
  const activePtyIds = useAppStore((s) => s.activePtyIds)
  const storeGoBack = useAppStore((s) => s.goBack)
  const handleGoBack = useCallback(() => {
    activePtyIds.forEach((id) => {
      window.electronAPI.pty.kill(id)
    })
    storeGoBack()
  }, [activePtyIds, storeGoBack])

  const [project, setProject] = useState<Project | null>(null)
  const [fullscreenTerminalId, setFullscreenTerminalId] = useState<string | null>(null)
  const [showTerminalMenu, setShowTerminalMenu] = useState(false)
  const [closeConfirmId, setCloseConfirmId] = useState<string | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const autoSave = useCallback((p: Project) => {
    setProject(p)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      saveProject(p)
    }, 2000)
  }, [saveProject])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (currentProject) {
      setProject(currentProject)
      setActiveTerminalId('')
      setFullscreenTerminalId(null)
    }
  }, [currentProject])

  useEffect(() => {
    if (project && project.terminals.length > 0 && !activeTerminalId) {
      setActiveTerminalId(project.terminals[0].id)
    }
  }, [project, activeTerminalId])

  const addTerminal = (type: TerminalType = 'shell') => {
    if (!project || project.terminals.length >= 8) return
    const newTerm: Terminal = {
      id: `term-${generateId()}`,
      title: `Terminal ${project.terminals.length + 1}`,
      cwd: currentProject?.path || '',
      type,
    }
    const updated = {
      ...project,
      terminals: [...project.terminals, newTerm],
      layout: { cols: project.terminals.length < 2 ? 1 : 2, rows: 1 },
      updatedAt: Date.now()
    }
    autoSave(updated)
    setActiveTerminalId(newTerm.id)
    setFullscreenTerminalId(null)
  }

  const removeTerminal = (id: string) => {
    if (hasPtyId(id)) {
      setCloseConfirmId(id)
      return
    }
    doRemoveTerminal(id)
  }

  useKeyboardShortcuts({
    addTerminal,
    closeTerminal: removeTerminal,
    exitFullscreen: () => setFullscreenTerminalId(null),
    toggleBrowser,
  })

  if (!project) {
    return (
      <div className="screen">
        <div className="screen-loading">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  const count = project.terminals.length
  let cols = 1, rows = 1
  if (count <= 1) { cols = 1; rows = 1 }
  else if (count === 2) { cols = 2; rows = 1 }
  else if (count <= 4) { cols = 2; rows = 2 }
  else if (count <= 6) { cols = 3; rows = 2 }
  else { cols = 4; rows = 2 }

  const toggleFullscreen = (termId: string) => {
    setFullscreenTerminalId((prev) => (prev === termId ? null : termId))
  }

  const doRemoveTerminal = (id: string) => {
    window.electronAPI.pty.kill(id)
    const updated = {
      ...project,
      terminals: project.terminals.filter(t => t.id !== id),
      updatedAt: Date.now()
    }
    if (activeTerminalId === id) {
      if (updated.terminals.length > 0) {
        setActiveTerminalId(updated.terminals[0].id)
      } else {
        setActiveTerminalId('')
      }
    }
    if (fullscreenTerminalId === id) {
      setFullscreenTerminalId(null)
    }
    autoSave(updated)
  }

  const confirmCloseTerminal = () => {
    if (closeConfirmId) {
      doRemoveTerminal(closeConfirmId)
      setCloseConfirmId(null)
    }
  }

  const isFullscreen = fullscreenTerminalId !== null

  return (
    <div className="screen editor-screen">
      <div className="editor-header">
        <button
          className={`sidebar-toggle-btn${sidebarOpen ? ' active' : ''}`}
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L6 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button className="back-btn" onClick={handleGoBack} aria-label="Back to projects">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Projects
        </button>
        <span className="editor-breadcrumb">
          {project.name}
        </span>
        {isFullscreen && (
          <button
            className="add-terminal-btn exit-fullscreen-btn"
            onClick={() => setFullscreenTerminalId(null)}
            aria-label="Exit fullscreen"
          >
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <path d="M4 1V4H1M8 1V4H11M4 11V8H1M8 11V8H11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Grid
          </button>
        )}
        <div className="terminal-add-wrapper">
          <button
            className="add-terminal-btn"
            onClick={() => setShowTerminalMenu(!showTerminalMenu)}
            onBlur={() => setTimeout(() => setShowTerminalMenu(false), 150)}
            aria-label="Add terminal"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Terminal
          </button>
          {showTerminalMenu && (
            <div className="terminal-type-menu" onMouseDown={(e) => e.preventDefault()}>
              <button className="terminal-type-option shell" onClick={() => { addTerminal('shell'); setShowTerminalMenu(false) }}>
                <span className="type-option-icon">{'>_'}</span>
                <span className="type-option-info">
                  <span className="type-option-name">Terminal</span>
                  <span className="type-option-desc">Normal shell</span>
                </span>
              </button>
              <button className="terminal-type-option opencode" onClick={() => { addTerminal('opencode'); setShowTerminalMenu(false) }}>
                <span className="type-option-icon">oc</span>
                <span className="type-option-info">
                  <span className="type-option-name">opencode</span>
                  <span className="type-option-desc">AI assistant (CLI)</span>
                </span>
              </button>
              <button className="terminal-type-option claude" onClick={() => { addTerminal('claude'); setShowTerminalMenu(false) }}>
                <span className="type-option-icon">cl</span>
                <span className="type-option-info">
                  <span className="type-option-name">Claude Code</span>
                  <span className="type-option-desc">Claude AI (CLI)</span>
                </span>
              </button>
            </div>
          )}
        </div>
        <div className="editor-header-right">
          <button
            className={`browser-toggle-btn${browserOpen ? ' active' : ''}`}
            onClick={toggleBrowser}
            aria-label={browserOpen ? 'Close browser' : 'Open browser'}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M7 1.5V12.5M1.5 7H12.5" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            Browser
          </button>
        </div>
      </div>

      <div
        className="editor-grid"
        style={isFullscreen ? {
          gridTemplateColumns: '1fr',
          gridTemplateRows: '1fr',
        } : {
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {project.terminals.map((term) => (
          <TerminalCell
            key={term.id}
            terminal={term}
            cwd={currentProject?.path || ''}
            isActive={activeTerminalId === term.id}
            isFullscreen={fullscreenTerminalId === term.id}
            isHidden={isFullscreen && fullscreenTerminalId !== term.id}
            onClick={() => setActiveTerminalId(term.id)}
            onClose={() => removeTerminal(term.id)}
            onFullscreen={() => toggleFullscreen(term.id)}
          />
        ))}
      </div>

      {closeConfirmId && (
        <ConfirmDialog
          title="Close terminal"
          message="This terminal has an active process. Are you sure you want to close it?"
          confirmLabel="Close"
          onConfirm={confirmCloseTerminal}
          onCancel={() => setCloseConfirmId(null)}
        />
      )}
    </div>
  )
}
