import React, { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../../stores/app-store'
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog'
import './SidebarRight.css'

export const SidebarRight: React.FC = () => {
  const currentProject = useAppStore((s) => s.currentProject)
  const projects = useAppStore((s) => s.projects)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)
  const createProject = useAppStore((s) => s.createProject)
  const deleteProject = useAppStore((s) => s.deleteProject)
  const renameProject = useAppStore((s) => s.renameProject)
  const selectProject = useAppStore((s) => s.selectProject)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingId])

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    setDeleteTarget({ id, name })
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    deleteProject(deleteTarget.id)
    setDeleteTarget(null)
  }

  const startRename = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    setRenamingId(id)
    setRenameValue(name)
  }

  const handleRename = async () => {
    if (renamingId && renameValue.trim()) {
      await renameProject(renamingId, renameValue.trim())
    }
    setRenamingId(null)
    setRenameValue('')
  }

  return (
    <div className={`sidebar-right${sidebarOpen ? ' open' : ''}`}>
      <div className="sidebar-right-header">
        <span className="sidebar-right-title">Workspaces</span>
        <button
          className="sidebar-right-close"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        >
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
            <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="sidebar-right-content">
        {projects.map((ws) => (
          <div
            key={ws.id}
            className={`workspace-tab${currentProject?.id === ws.id ? ' active' : ''}`}
            onClick={() => selectProject(ws)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                selectProject(ws)
              }
            }}
            aria-label={`Workspace: ${ws.name}`}
          >
            <div className={`tab-status-dot${currentProject?.id === ws.id ? ' active' : ''}`} />
            <div className="tab-info">
              {renamingId === ws.id ? (
                <input
                  ref={renameInputRef}
                  className="tab-rename-input"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename()
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Rename workspace"
                />
              ) : (
                <span
                  className="tab-name"
                  onDoubleClick={(e) => startRename(e, ws.id, ws.name)}
                >
                  {ws.name}
                </span>
              )}
              <span className="tab-meta">{ws.terminals.length} terminal{ws.terminals.length !== 1 ? 's' : ''}</span>
            </div>
            <button
              className="tab-close-btn"
              onClick={(e) => handleDelete(e, ws.id, ws.name)}
              aria-label={`Delete ${ws.name}`}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}

        <button className="add-workspace-btn" onClick={() => createProject()}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          New Workspace
        </button>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete workspace"
          message={`Are you sure you want to delete "${deleteTarget.name}"? All terminal sessions will be lost.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
