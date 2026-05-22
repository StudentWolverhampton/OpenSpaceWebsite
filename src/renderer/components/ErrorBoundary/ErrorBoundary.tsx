import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="screen">
          <div className="screen-header">
            <span className="screen-title">Something went wrong</span>
          </div>
          <div className="screen-content">
            <p style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 13 }}>
              {this.state.error?.message}
            </p>
            <button
              className="add-terminal-btn"
              style={{ marginTop: 16 }}
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Retry
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
