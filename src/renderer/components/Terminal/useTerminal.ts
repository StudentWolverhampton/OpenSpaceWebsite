import { useEffect, useRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'

type TerminalType = 'shell' | 'opencode' | 'claude'

interface UseTerminalOptions {
  id: string
  cwd?: string
  type?: TerminalType
}

export function useTerminal({ id, cwd, type }: UseTerminalOptions) {
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const initializedRef = useRef(false)

  const initTerminal = useCallback(
    async (container: HTMLElement) => {
      if (initializedRef.current) return
      initializedRef.current = true

      try {
        const terminal = new Terminal({
          fontFamily: '"JetBrains Mono", "Cascadia Code", "Consolas", monospace',
          fontSize: 14,
          cursorBlink: true,
          cursorStyle: 'bar',
          scrollback: 5000,
          theme: {
            background: '#0d1117',
            foreground: '#d4d4d4',
            cursor: '#00d4ff',
            cursorAccent: '#0d1117',
            selectionBackground: 'rgba(0, 212, 255, 0.4)',
            selectionInactiveBackground: 'rgba(0, 212, 255, 0.18)',
            black: '#1e1e2e',
            red: '#f38ba8',
            green: '#a6e3a1',
            yellow: '#f9e2af',
            blue: '#89b4fa',
            magenta: '#cba6f7',
            cyan: '#00d4ff',
            white: '#d4d4d4',
            brightBlack: '#585b70',
            brightRed: '#f38ba8',
            brightGreen: '#a6e3a1',
            brightYellow: '#f9e2af',
            brightBlue: '#89b4fa',
            brightMagenta: '#cba6f7',
            brightCyan: '#00e5ff',
            brightWhite: '#f5f5f5',
          },
        })

        terminal.attachCustomKeyEventHandler((e) => {
          if (e.type === 'keydown' && (e.ctrlKey || e.metaKey)) {
            if (e.key === 'v') return false
            if (e.key === 'c' && terminalRef.current?.hasSelection()) {
              window.electronAPI.clipboard.writeText(terminalRef.current.getSelection())
              return false
            }
          }
          return true
        })

        const fitAddon = new FitAddon()
        terminal.loadAddon(fitAddon)
        terminal.open(container)
        terminal.focus()

        try { fitAddon.fit() } catch {}

        terminalRef.current = terminal
        fitAddonRef.current = fitAddon

        // Only spawn PTY if not already alive (survived from workspace switch)
        const alreadyAlive = await window.electronAPI.pty.has(id)
        if (!alreadyAlive) {
          window.electronAPI.pty.spawn(id, {
            cols: terminal.cols,
            rows: terminal.rows,
            cwd,
          })

          if (type && type !== 'shell') {
            setTimeout(() => {
              window.electronAPI.pty.write(id, type === 'claude' ? 'claude\r' : 'opencode\r')
            }, 1500)
          }
        } else {
          window.electronAPI.pty.resize(id, terminal.cols, terminal.rows)
        }

        // PTY -> terminal
        const unsubData = window.electronAPI.pty.onData((payload) => {
          if (payload.id === id) {
            terminal.write(payload.data)
          }
        })

        // terminal -> PTY
        const inputDisposable = terminal.onData((data) => {
          window.electronAPI.pty.write(id, data)
        })

        // Capture-phase keydown for Ctrl+V paste
        const handleKeyDown = (e: KeyboardEvent) => {
          const isPaste = (e.ctrlKey || e.metaKey) && e.key === 'v'
          if (!isPaste) return
          if (!container.contains(e.target as Node)) return

          e.preventDefault()
          e.stopPropagation()

          window.electronAPI.clipboard.readText()
            .then((text) => {
              if (text) terminal.paste(text)
            })
            .catch((err) => console.error('[paste] error:', err))
        }
        document.addEventListener('keydown', handleKeyDown, true)

        // Refocus terminal on click
        const handleClick = () => terminal.focus()
        container.addEventListener('click', handleClick)

        // Resize
        const resizeObserver = new ResizeObserver(() => {
          try {
            fitAddon.fit()
            window.electronAPI.pty.resize(id, terminal.cols, terminal.rows)
          } catch {}
        })
        resizeObserver.observe(container)

        cleanupRef.current = () => {
          try {
            unsubData()
            inputDisposable.dispose()
            document.removeEventListener('keydown', handleKeyDown, true)
            container.removeEventListener('click', handleClick)
            resizeObserver.disconnect()
            // Don't kill PTY — it survives workspace switches.
            // kill is called explicitly from Editor.removeTerminal only.
            terminal.dispose()
          } catch (err) {
            console.error('Terminal cleanup error:', err)
          }
        }
      } catch (error) {
        console.error('Terminal init failed:', error)
      }
    },
    [id, cwd]
  )

  useEffect(() => {
    return () => {
      cleanupRef.current?.()
      initializedRef.current = false
    }
  }, [])

  return { initTerminal, terminal: terminalRef }
}
