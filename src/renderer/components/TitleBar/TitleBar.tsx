import React, { useState, useEffect } from 'react'
import { useAppStore } from '../../stores/app-store'
import './TitleBar.css'

export const TitleBar: React.FC = () => {
  const screen = useAppStore((s) => s.screen)
  const currentProject = useAppStore((s) => s.currentProject)

  const [isMaximized, setIsMaximized] = useState(false)
  const [platform, setPlatform] = useState<string>('win32')

  useEffect(() => {
    window.electronAPI.window.isMaximized().then(setIsMaximized)
    window.electronAPI.app.getPlatform().then(setPlatform)

    const cleanup = window.electronAPI.window.onMaximizeChange(setIsMaximized)
    return cleanup
  }, [])

  const handleMinimize = () => window.electronAPI.window.minimize()
  const handleMaximize = () => window.electronAPI.window.maximize()
  const handleClose = () => window.electronAPI.window.close()

  const isMac = platform === 'darwin'

  return (
    <div className="titlebar" onDoubleClick={handleMaximize}>
      <div className="titlebar-drag-region">
        {isMac && (
          <div className="traffic-lights">
            <button
              className="traffic-light close"
              onClick={handleClose}
              aria-label="Close"
            />
            <button
              className="traffic-light minimize"
              onClick={handleMinimize}
              aria-label="Minimize"
            />
            <button
              className="traffic-light maximize"
              onClick={handleMaximize}
              aria-label="Maximize"
            />
          </div>
        )}

        <div className="titlebar-content">
          <div className="titlebar-logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7L12 12L22 7L12 2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M2 17L12 22L22 17"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M2 12L12 17L22 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="titlebar-title">
              {screen === 'editor' && currentProject
                ? currentProject.name
                : 'OpenSpace'}
            </span>
          </div>
        </div>
      </div>

      {!isMac && (
        <div className="window-controls">
          <button
            className="window-control minimize"
            onClick={handleMinimize}
            aria-label="Minimize"
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M2 6H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <button
            className="window-control maximize"
            onClick={handleMaximize}
            aria-label={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? (
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path
                  d="M3 3H9V9H3V3Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M5 1V3H3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12">
                <rect
                  x="2"
                  y="2"
                  width="8"
                  height="8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
          <button
            className="window-control close"
            onClick={handleClose}
            aria-label="Close"
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path
                d="M3 3L9 9M9 3L3 9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
