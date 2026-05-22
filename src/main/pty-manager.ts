import * as os from 'os'
import { BrowserWindow } from 'electron'

interface PtyInstance {
  id: string
  process: any
  createdAt: number
  isSimulated: boolean
  window: BrowserWindow
}

export class PtyManager {
  private instances: Map<string, PtyInstance> = new Map()
  private nodePty: any = null
  private nodePtyChecked = false

  async spawn(
    id: string,
    window: BrowserWindow,
    options?: {
      shell?: string
      cols?: number
      rows?: number
      cwd?: string
      env?: Record<string, string>
      command?: string
    }
  ): Promise<void> {
    // If PTY already exists for this ID, just reattach to new window
    if (this.instances.has(id)) {
      const existing = this.instances.get(id)!
      existing.window = window
      if (options?.cols && options?.rows && !existing.isSimulated) {
        existing.process.resize(options.cols, options.rows)
      }
      return
    }

    // Check if node-pty is available (only once)
    if (!this.nodePtyChecked) {
      try {
        this.nodePty = await import('node-pty')
        console.log('node-pty loaded successfully - using real terminal')
      } catch (error) {
        console.log('node-pty not available, using simulated terminal')
        this.nodePty = null
      }
      this.nodePtyChecked = true
    }

    // Try to use real node-pty
    if (this.nodePty) {
      try {
        const shell =
          options?.shell ??
          (os.platform() === 'win32' ? 'powershell.exe' : 'bash')

        const ptyProcess = this.nodePty.spawn(shell, [], {
          name: 'xterm-256color',
          cols: options?.cols ?? 80,
          rows: options?.rows ?? 24,
          cwd: options?.cwd ?? os.homedir(),
          env: { ...process.env, ...options?.env } as Record<string, string>,
        })

        this.instances.set(id, {
          id,
          process: ptyProcess,
          createdAt: Date.now(),
          isSimulated: false,
          window,
        })

        ptyProcess.onData((data: string) => {
          const inst = this.instances.get(id)
          if (inst && !inst.window.isDestroyed()) {
            inst.window.webContents.send('pty:data', { id, data })
          }
        })

        ptyProcess.onExit(({ exitCode, signal }: { exitCode: number; signal?: number }) => {
          const inst = this.instances.get(id)
          if (inst && !inst.window.isDestroyed()) {
            inst.window.webContents.send('pty:exit', { id, exitCode, signal })
          }
          this.instances.delete(id)
        })

        // Send command if specified
        if (options?.command) {
          setTimeout(() => {
            ptyProcess.write(options.command + '\r')
          }, 500)
        }

        return
      } catch (error) {
        console.error('Failed to spawn with node-pty:', error)
      }
    }

    // Fallback to simulated terminal
    const simulated = new SimulatedTerminal(id, window)
    this.instances.set(id, {
      id,
      process: simulated,
      createdAt: Date.now(),
      isSimulated: true,
      window,
    })
  }

  write(id: string, data: string): void {
    const instance = this.instances.get(id)
    instance?.process.write(data)
  }

  resize(id: string, cols: number, rows: number): void {
    const instance = this.instances.get(id)
    if (instance && !instance.isSimulated) {
      instance.process.resize(cols, rows)
    }
  }

  has(id: string): boolean {
    return this.instances.has(id)
  }

  kill(id: string): void {
    const instance = this.instances.get(id)
    if (instance) {
      if (instance.isSimulated) {
        instance.process.kill()
      } else {
        instance.process.kill()
      }
      this.instances.delete(id)
    }
  }

  killAll(): void {
    for (const [id] of this.instances) {
      this.kill(id)
    }
  }
}

// Simulated terminal for fallback
class SimulatedTerminal {
  private output: string[] = []
  private onDataCallback: ((data: string) => void) | null = null
  private commandHistory: string[] = []
  private currentDir: string = '~'
  private historyIndex: number = -1

  constructor(private id: string, private window: BrowserWindow) {
    setTimeout(() => {
      this.emit('\r\n')
      this.emit('\x1b[36m  ██╗   ██╗██╗██████╗ ███████╗\x1b[0m\r\n')
      this.emit('\x1b[36m  ██║   ██║██║██╔══██╗██╔════╝\x1b[0m\r\n')
      this.emit('\x1b[36m  ██║   ██║██║██████╔╝███████╗\x1b[0m\r\n')
      this.emit('\x1b[36m  ╚██╗ ██╔╝██║██╔══██╗╚════██║\x1b[0m\r\n')
      this.emit('\x1b[36m   ╚████╔╝ ██║██████╔╝███████║\x1b[0m\r\n')
      this.emit('\x1b[36m    ╚═══╝  ╚═╝╚═════╝ ╚══════╝\x1b[0m\r\n')
      this.emit('\r\n')
      this.emit('\x1b[90m  Simulated Terminal Mode\x1b[0m\r\n')
      this.emit('\x1b[90m  Type "help" for available commands\x1b[0m\r\n')
      this.emit('\r\n')
      this.showPrompt()
    }, 100)
  }

  private emit(data: string) {
    this.onDataCallback?.(data)
  }

  private showPrompt() {
    this.emit(`\x1b[32m${this.currentDir}\x1b[0m \x1b[36m❯\x1b[0m `)
  }

  write(data: string) {
    if (data === '\r') {
      this.emit('\r\n')
      if (this.output.length > 0) {
        const cmd = this.output.join('')
        this.commandHistory.push(cmd)
        this.historyIndex = this.commandHistory.length
        this.processCommand(cmd)
        this.output = []
      } else {
        this.showPrompt()
      }
    } else if (data === '\x7f') {
      if (this.output.length > 0) {
        this.output.pop()
        this.emit('\b \b')
      }
    } else if (data === '\x03') {
      this.emit('^C\r\n')
      this.output = []
      this.showPrompt()
    } else if (data === '\x1b[A') {
      if (this.historyIndex > 0) {
        this.historyIndex--
        this.clearCurrentLine()
        this.output = this.commandHistory[this.historyIndex].split('')
        this.emit(this.commandHistory[this.historyIndex])
      }
    } else if (data === '\x1b[B') {
      if (this.historyIndex < this.commandHistory.length - 1) {
        this.historyIndex++
        this.clearCurrentLine()
        this.output = this.commandHistory[this.historyIndex].split('')
        this.emit(this.commandHistory[this.historyIndex])
      } else {
        this.historyIndex = this.commandHistory.length
        this.clearCurrentLine()
        this.output = []
      }
    } else if (data === '\t') {
      this.handleTab()
    } else if (data.length === 1) {
      this.output.push(data)
      this.emit(data)
    }
  }

  private clearCurrentLine() {
    for (let i = 0; i < this.output.length; i++) {
      this.emit('\b \b')
    }
  }

  private handleTab() {
    const partial = this.output.join('').toLowerCase()
    const commands = ['help', 'clear', 'echo', 'date', 'whoami', 'ls', 'pwd', 'cd', 'neofetch', 'cat', 'mkdir', 'touch', 'exit']
    const matches = commands.filter(cmd => cmd.startsWith(partial))

    if (matches.length === 1) {
      this.clearCurrentLine()
      this.output = matches[0].split('')
      this.emit(matches[0])
    } else if (matches.length > 1) {
      this.emit('\r\n')
      this.emit(matches.join('  ') + '\r\n')
      this.showPrompt()
      this.emit(this.output.join(''))
    }
  }

  private processCommand(cmd: string) {
    const parts = cmd.trim().split(/\s+/)
    const command = parts[0]?.toLowerCase()
    const args = parts.slice(1)

    switch (command) {
      case 'help':
        this.emit('\x1b[1m\x1b[33mAvailable commands:\x1b[0m\r\n')
        this.emit('  \x1b[36mhelp\x1b[0m       - Show this help\r\n')
        this.emit('  \x1b[36mclear\x1b[0m      - Clear terminal\r\n')
        this.emit('  \x1b[36mecho\x1b[0m       - Echo text\r\n')
        this.emit('  \x1b[36mdate\x1b[0m       - Show date\r\n')
        this.emit('  \x1b[36mwhoami\x1b[0m     - Show current user\r\n')
        this.emit('  \x1b[36mls\x1b[0m         - List files\r\n')
        this.emit('  \x1b[36mpwd\x1b[0m        - Print working directory\r\n')
        this.emit('  \x1b[36mcd\x1b[0m         - Change directory\r\n')
        this.emit('  \x1b[36mcat\x1b[0m         - Display file contents\r\n')
        this.emit('  \x1b[36mmkdir\x1b[0m       - Create directory\r\n')
        this.emit('  \x1b[36mtouch\x1b[0m       - Create empty file\r\n')
        this.emit('  \x1b[36mneofetch\x1b[0m   - Show system info\r\n')
        this.emit('  \x1b[36mexit\x1b[0m        - Close terminal\r\n')
        break

      case 'clear':
        this.emit('\x1b[2J\x1b[H')
        break

      case 'echo':
        this.emit(args.join(' ') + '\r\n')
        break

      case 'date':
        this.emit('\x1b[33m' + new Date().toLocaleString() + '\x1b[0m\r\n')
        break

      case 'whoami':
        this.emit('\x1b[36m' + os.userInfo().username + '\x1b[0m\r\n')
        break

      case 'ls':
        this.emit('\x1b[34mDesktop/\x1b[0m  \x1b[34mDocuments/\x1b[0m  \x1b[34mDownloads/\x1b[0m  \x1b[34mPictures/\x1b[0m\r\n')
        this.emit('\x1b[34mMusic/\x1b[0m    \x1b[34mVideos/\x1b[0m    \x1b[32mREADME.md\x1b[0m  \x1b[33mconfig.json\x1b[0m\r\n')
        break

      case 'pwd':
        this.emit('/home/' + os.userInfo().username + '/' + this.currentDir.replace('~', '') + '\r\n')
        break

      case 'cd':
        if (!args[0] || args[0] === '~') {
          this.currentDir = '~'
        } else if (args[0] === '..') {
          this.currentDir = '~'
        } else {
          this.currentDir = args[0].startsWith('/') ? args[0] : '~/' + args[0]
        }
        break

      case 'cat':
        if (!args[0]) {
          this.emit('\x1b[31mUsage: cat <filename>\x1b[0m\r\n')
        } else if (args[0] === 'README.md') {
          this.emit('\x1b[1m\x1b[36mOpenSpace\x1b[0m\r\n')
          this.emit('A premium terminal workspace with luxury Deep Ocean aesthetic.\r\n')
          this.emit('\r\n')
          this.emit('Built with Electron + React + xterm.js\r\n')
        } else if (args[0] === 'config.json') {
          this.emit('{\r\n')
          this.emit('  "theme": "deep-ocean",\r\n')
          this.emit('  "fontSize": 14,\r\n')
          this.emit('  "fontFamily": "JetBrains Mono"\r\n')
          this.emit('}\r\n')
        } else {
          this.emit(`\x1b[31mcat: ${args[0]}: No such file or directory\x1b[0m\r\n`)
        }
        break

      case 'mkdir':
        if (!args[0]) {
          this.emit('\x1b[31mUsage: mkdir <directory>\x1b[0m\r\n')
        } else {
          this.emit(`\x1b[32mCreated directory: ${args[0]}\x1b[0m\r\n`)
        }
        break

      case 'touch':
        if (!args[0]) {
          this.emit('\x1b[31mUsage: touch <filename>\x1b[0m\r\n')
        } else {
          this.emit(`\x1b[32mCreated file: ${args[0]}\x1b[0m\r\n`)
        }
        break

      case 'neofetch':
        this.emit('\x1b[36m        .---.        \x1b[0m \x1b[1m\x1b[33m' + os.userInfo().username + '\x1b[0m@\x1b[1m\x1b[33mopenspace\x1b[0m\r\n')
        this.emit('\x1b[36m       /     \\       \x1b[0m \x1b[90m─────────────────\x1b[0m\r\n')
        this.emit('\x1b[36m      /.      \\      \x1b[0m \x1b[1m\x1b[33mOS:\x1b[0m OpenSpace 1.0\r\n')
        this.emit('\x1b[36m     / .  .    \\     \x1b[0m \x1b[1m\x1b[33mHost:\x1b[0m ' + os.hostname() + '\r\n')
        this.emit('\x1b[36m    /  .    .   \\    \x1b[0m \x1b[1m\x1b[33mKernel:\x1b[0m ' + os.release() + '\r\n')
        this.emit('\x1b[36m   /.   .     .  \\   \x1b[0m \x1b[1m\x1b[33mShell:\x1b[0m openspace-sim\r\n')
        this.emit('\x1b[36m  /.___________.\\  \x1b[0m \x1b[1m\x1b[33mTerminal:\x1b[0m OpenSpace Terminal\r\n')
        this.emit('\x1b[36m                       \x1b[0m \x1b[1m\x1b[33mCPU:\x1b[0m ' + (os.cpus()[0]?.model || 'Unknown') + '\r\n')
        this.emit('\x1b[36m                       \x1b[0m \x1b[1m\x1b[33mMemory:\x1b[0m ' + Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB\r\n')
        this.emit('\x1b[36m                       \x1b[0m \x1b[1m\x1b[33mUptime:\x1b[0m ' + Math.round(os.uptime() / 60) + ' mins\r\n')
        break

      case 'exit':
        this.emit('\r\n\x1b[33mClosing terminal...\x1b[0m\r\n')
        if (!this.window?.isDestroyed()) {
          this.window?.webContents.send('pty:exit', { id: this.id, exitCode: 0 })
        }
        break

      default:
        if (command) {
          this.emit(`\x1b[31m${command}: command not found\x1b[0m\r\n`)
          this.emit('\x1b[90mType "help" for available commands\x1b[0m\r\n')
        }
    }

    this.showPrompt()
  }

  onData(callback: (data: string) => void) {
    this.onDataCallback = callback
  }

  resize(_cols: number, _rows: number) {}

  kill() {}
}
