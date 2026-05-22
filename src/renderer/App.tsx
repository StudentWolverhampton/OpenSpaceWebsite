import React from 'react'
import { TitleBar } from './components/TitleBar/TitleBar'
import { useAppStore } from './stores/app-store'
import { ProjectList } from './screens/ProjectList'
import { Editor } from './screens/Editor'
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary'
import { SidebarRight } from './components/SidebarRight/SidebarRight'
import { BrowserPanel } from './components/BrowserPanel/BrowserPanel'
import { ToastContainer } from './components/Toast/ToastContainer'
import './App.css'

const App: React.FC = () => {
  const screen = useAppStore((s) => s.screen)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const browserOpen = useAppStore((s) => s.browserOpen)

  const renderScreen = () => {
    switch (screen) {
      case 'projects':
        return <ProjectList />
      case 'editor':
        return <Editor />
      default:
        return <ProjectList />
    }
  }

  return (
    <div className="app">
      <TitleBar />
      <div className="app-body">
        {sidebarOpen && screen === 'editor' && <SidebarRight />}
        <div className="app-main">
          <ErrorBoundary>
            {renderScreen()}
          </ErrorBoundary>
        </div>
        {browserOpen && screen === 'editor' && (
          <ErrorBoundary>
            <BrowserPanel />
          </ErrorBoundary>
        )}
      </div>
      <ToastContainer />
    </div>
  )
}

export default App
