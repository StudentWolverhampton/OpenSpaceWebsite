# OpenSpace

Premium Electron terminal workspace with luxury Deep Ocean aesthetic.

## Tech Stack
- **Runtime**: Electron 33 + Vite 5 + electron-vite
- **Frontend**: React 19, TypeScript 5.6, Zustand 5
- **Terminal**: xterm.js 5.5 with WebGL & Fit addons
- **Build**: electron-builder (Win/Mac/Linux)

## Architecture
```
src/
  main/       # Electron main process (Node.js)
    index.ts          # App entry, window creation
    window-manager.ts # BrowserWindow lifecycle
    pty-manager.ts    # Node PTY process management
    ipc-handlers.ts   # IPC channel registrations
    file-manager.ts   # File system operations
  preload/
    index.ts          # contextBridge API exposure
  renderer/           # React UI (renderer process)
    main.tsx          # React entry
    App.tsx           # Root component
    screens/          # Top-level views (Editor, ProjectList)
    components/       # UI components (Terminal, SidebarRight, BrowserPanel, TitleBar, etc.)
    stores/           # Zustand store (app-store.ts, toast-store.ts)
    hooks/            # Custom React hooks (useKeyboardShortcuts)
    types/            # TypeScript type definitions
    utils/            # Utility functions
    styles/           # CSS styles
    assets/           # Static assets
```

## Critical Context
- Electron 33 requires `webviewTag: true` in BrowserWindow preferences for `<webview>` tags to work
- `<webview>` runs in a separate renderer process — Pointer Events with `setPointerCapture` needed for resize handle across webview boundary
- 1 project = 1 workspace = 1 directory on disk — terminals and layout stored in project JSON inside `~/.openspace/projects/`
- Old project files without `terminals`/`layout` fields are auto-migrated on load
- `node-pty` rebuilt for Electron 33 via `@electron/rebuild`; falls back to simulated terminal if unavailable

## Commands
- `npm run dev` — Start dev with hot reload
- `npm run build` — Build for production
- `npm run start` — Preview production build
- `npm run package` — Package for all platforms
- `npm run package:win` / `:mac` / `:linux` — Platform-specific package

## Key Dependencies
- `node-pty` — native PTY for real terminal (falls back to simulated terminal if unavailable)
- `@electron/rebuild` — rebuild native modules for Electron's Node version

## Features Implemented
- **P0**: Zustand persist (UI state survives refresh), keyboard shortcuts (Ctrl+Shift+T/W/Tab, Escape, F11), toast notifications on errors, ConfirmDialog for terminal close with active PTY, goBack kills all PTYs
- **P1**: English locale, 2s autoSave debounce, Enter closes ConfirmDialog, dynamic titlebar with project name, double-click titlebar to maximize
- **Terminal types**: shell / opencode / claude — dropdown menu on "+ Terminal" button, auto-runs opencode/claude after spawn
- **Browser panel**: resizable `<webview>` with address bar, back/forward/refresh; pointer-event resize handle
- **1 project = 1 workspace**: removed Workspace entity entirely; Project holds `terminals[]` + `layout` directly; no WorkspaceList screen
- **Bioluminescent Deep UI**: radial-gradient background, JetBrains Mono + Mona Sans fonts, card glow, staggered animations, custom scrollbar
- **node-pty**: installed and rebuilt for Electron 33; real PTY with simulated fallback
- **Icons**: generated 256×256 icon set (resources/icon.png, icon.ico, icon.icns)

## Conventions
- TypeScript strict mode (separate tsconfig for node/web)
- Named exports preferred
- Zustand stores in `src/renderer/stores/`
- React components in PascalCase directories
- CSS modules or plain CSS files
- IPC handlers in `src/main/ipc-handlers.ts`
- `window.electronAPI` typed in `src/renderer/types/electron.d.ts` — update when adding new preload APIs
