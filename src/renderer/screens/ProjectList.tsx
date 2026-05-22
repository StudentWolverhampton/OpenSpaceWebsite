import React, { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../stores/app-store'
import { ConfirmDialog } from '../components/ConfirmDialog/ConfirmDialog'
import { EmptyState } from '../components/EmptyState/EmptyState'
import { formatDate } from '../utils/format-date'
import './Screens.css'

export const ProjectList: React.FC = () => {
  const projects = useAppStore((s) => s.projects)
  const loadProjects = useAppStore((s) => s.loadProjects)
  const createProject = useAppStore((s) => s.createProject)
  const deleteProject = useAppStore((s) => s.deleteProject)
  const renameProject = useAppStore((s) => s.renameProject)
  const selectProject = useAppStore((s) => s.selectProject)

  const [loading, setLoading] = useState(true)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProjects().finally(() => setLoading(false))
  }, [loadProjects])

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingId])

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteTarget({ id, name })
  }

  const confirmDelete = async () => {
    if (deleteTarget) {
      await deleteProject(deleteTarget.id)
      setDeleteTarget(null)
    }
  }

  const startRename = (id: string, name: string, e: React.MouseEvent) => {
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
    <div className="screen project-list">
      <div className="screen-header">
        <div className="screen-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#00d4ff" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M2 17L12 22L22 17" stroke="#00d4ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12L12 17L22 12" stroke="#00d4ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h1>OpenSpace</h1>
        </div>
        <p className="screen-subtitle">Select or create a project</p>
      </div>

      <div className="screen-content">
        {loading ? (
          <div className="screen-loading">
            <div className="spinner" />
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state-wrapper">
            <EmptyState
              title="No projects yet"
              description="Open a folder to create your first project and start building your workspace."
            />
            <button className="create-project-btn" onClick={createProject}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Open Folder
            </button>
          </div>
        ) : (
          <>
            <div className="section-header">
              <span className="section-title">Projects</span>
              <span className="section-count">{projects.length}</span>
            </div>
            <div className="project-grid">
              {projects.map((project, idx) => (
                <div
                  key={project.id}
                  className="project-card"
                  style={{ animationDelay: `${idx * 40}ms` }}
                  role="button"
                  tabIndex={0}
                  onClick={() => renamingId !== project.id && selectProject(project)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      renamingId !== project.id && selectProject(project)
                    }
                  }}
                  aria-label={`Project: ${project.name}`}
                >
                  <div className="project-card-top">
                    <div className="project-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="project-actions">
                      <button
                        className="action-btn rename"
                        onClick={(e) => startRename(project.id, project.name, e)}
                        title="Rename"
                        aria-label={`Rename ${project.name}`}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        className="action-btn delete"
                        onClick={(e) => handleDelete(project.id, project.name, e)}
                        title="Delete"
                        aria-label={`Delete ${project.name}`}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="project-info">
                    {renamingId === project.id ? (
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename()
                          if (e.key === 'Escape') setRenamingId(null)
                        }}
                        className="rename-input"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Rename project"
                      />
                    ) : (
                      <span className="project-name">{project.name}</span>
                    )}
                    <span className="project-path">{project.path}</span>
                    <span className="project-date">{formatDate(project.updatedAt)}</span>
                  </div>
                </div>
              ))}

              <div
                className="project-card add-new"
                onClick={createProject}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    createProject()
                  }
                }}
                aria-label="Open a folder"
              >
                <div className="add-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="add-label">Open Folder</span>
              </div>
            </div>
          </>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete project"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
