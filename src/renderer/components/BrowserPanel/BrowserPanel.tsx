import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '../../stores/app-store'
import './BrowserPanel.css'

const MIN_WIDTH = 250
const PANEL_MAX_WIDTH = 1200

interface WebviewTag extends HTMLElement {
  src: string
  loadURL: (url: string) => Promise<void>
  goBack: () => void
  goForward: () => void
  reload: () => void
  canGoBack: () => boolean
  canGoForward: () => boolean
  addEventListener: (event: string, listener: (...args: any[]) => void) => void
  removeEventListener: (event: string, listener: (...args: any[]) => void) => void
  setAttribute: (name: string, value: string) => void
}

export const BrowserPanel: React.FC = () => {
  const browserOpen = useAppStore((s) => s.browserOpen)
  const browserUrl = useAppStore((s) => s.browserUrl)
  const panelWidth = useAppStore((s) => s.panelWidth)
  const setBrowserUrl = useAppStore((s) => s.setBrowserUrl)
  const setBrowserOpen = useAppStore((s) => s.setBrowserOpen)
  const setPanelWidth = useAppStore((s) => s.setPanelWidth)

  const webviewRef = useRef<WebviewTag | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isResizingRef = useRef(false)
  const webviewReadyRef = useRef(false)
  const [inputUrl, setInputUrl] = useState(browserUrl)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navStateCleanupRef = useRef<(() => void) | null>(null)

  const clampWidth = useCallback((w: number) => {
    const max = Math.max(window.innerWidth * 0.85, MIN_WIDTH)
    return Math.min(Math.max(w, MIN_WIDTH), Math.max(max, PANEL_MAX_WIDTH))
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    isResizingRef.current = true

    const startX = e.clientX
    const startWidth = panelWidth

    const onPointerMove = (ev: PointerEvent) => {
      if (!isResizingRef.current) return
      const diff = startX - ev.clientX
      setPanelWidth(clampWidth(startWidth + diff))
    }

    const onPointerUp = () => {
      isResizingRef.current = false
      target.removeEventListener('pointermove', onPointerMove)
      target.removeEventListener('pointerup', onPointerUp)
      try { target.releasePointerCapture(e.pointerId) } catch {}
    }

    target.addEventListener('pointermove', onPointerMove)
    target.addEventListener('pointerup', onPointerUp)
  }, [panelWidth, clampWidth])

  const navigate = useCallback((url: string) => {
    let normalized = url.trim()
    if (normalized && !/^https?:\/\//i.test(normalized)) {
      normalized = 'https://' + normalized
    }
    setInputUrl(normalized)
    setBrowserUrl(normalized)
  }, [setBrowserUrl])

  // Create/destroy webview when browser toggles
  useEffect(() => {
    if (!browserOpen) {
      navStateCleanupRef.current?.()
      navStateCleanupRef.current = null
      if (webviewRef.current) {
        try { containerRef.current?.removeChild(webviewRef.current) } catch {}
        webviewRef.current = null
      }
      return
    }

    const container = containerRef.current
    if (!container) return

    const wv = document.createElement('webview') as unknown as WebviewTag
    wv.style.height = '100%'
    wv.setAttribute('allowpopups', '')
    wv.setAttribute('src', browserUrl || 'about:blank')
    container.appendChild(wv)
    webviewRef.current = wv
    webviewReadyRef.current = false

    const onDomReady = () => {
      webviewReadyRef.current = true
    }
    wv.addEventListener('dom-ready', onDomReady)

    const onNavigate = (e: any) => {
      setInputUrl(e.url as string)
      setBrowserUrl(e.url as string)
      setCanGoBack(wv.canGoBack())
      setCanGoForward(wv.canGoForward())
    }
    const onNavigateInPage = (e: any) => {
      if (e.isMainFrame) {
        setInputUrl(e.url as string)
        setBrowserUrl(e.url as string)
        setCanGoBack(wv.canGoBack())
        setCanGoForward(wv.canGoForward())
      }
    }
    const onStartLoading = () => setIsLoading(true)
    const onStopLoading = () => setIsLoading(false)

    wv.addEventListener('did-navigate', onNavigate)
    wv.addEventListener('did-navigate-in-page', onNavigateInPage)
    wv.addEventListener('did-start-loading', onStartLoading)
    wv.addEventListener('did-stop-loading', onStopLoading)

    navStateCleanupRef.current = () => {
      wv.removeEventListener('dom-ready', onDomReady)
      wv.removeEventListener('did-navigate', onNavigate)
      wv.removeEventListener('did-navigate-in-page', onNavigateInPage)
      wv.removeEventListener('did-start-loading', onStartLoading)
      wv.removeEventListener('did-stop-loading', onStopLoading)
    }

    return () => {
      navStateCleanupRef.current?.()
      navStateCleanupRef.current = null
      try { container.removeChild(wv) } catch {}
      webviewRef.current = null
      webviewReadyRef.current = false
    }
  }, [browserOpen, setBrowserUrl])

  // Navigate when URL changes (after initial dom-ready)
  useEffect(() => {
    if (browserOpen && webviewRef.current && browserUrl && webviewReadyRef.current) {
      webviewRef.current.loadURL(browserUrl).catch(() => {})
    }
  }, [browserUrl, browserOpen])

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      navigate(inputUrl)
    }
  }

  const goBack = () => webviewRef.current?.goBack()
  const goForward = () => webviewRef.current?.goForward()
  const reload = () => webviewRef.current?.reload()

  return (
    <div
      className={`browser-panel${isResizingRef.current ? ' resizing' : ''}`}
      style={{ width: panelWidth }}
    >
      <div className="browser-panel-resize-handle" onPointerDown={handlePointerDown} />
      <div className="browser-panel-header">
        <span className="browser-panel-title">Browser</span>
        <button
          className="browser-panel-close"
          onClick={() => setBrowserOpen(false)}
          aria-label="Close browser"
        >
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
            <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="browser-toolbar">
        <button className="browser-nav-btn" onClick={goBack} disabled={!canGoBack} aria-label="Go back">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M7 3L4 6L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button className="browser-nav-btn" onClick={goForward} disabled={!canGoForward} aria-label="Go forward">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M5 3L8 6L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button className={`browser-nav-btn${isLoading ? ' loading' : ''}`} onClick={reload} aria-label="Reload">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6C2 3.79 3.79 2 6 2C7.87 2 9.44 3.22 9.93 5M10 6C10 8.21 8.21 10 6 10C4.13 10 2.56 8.78 2.07 7"
              stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
        <div className="browser-url-bar">
          <input
            className="browser-url-input"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onFocus={(e) => e.target.select()}
            placeholder="Enter URL..."
            spellCheck={false}
          />
        </div>
      </div>

      <div className="browser-content" ref={containerRef} />
    </div>
  )
}
