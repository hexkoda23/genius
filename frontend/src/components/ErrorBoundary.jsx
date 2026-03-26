// src/components/ErrorBoundary.jsx
// Wraps the whole app — catches any crash and shows a recovery screen
// instead of a blank white page. Also logs the exact error.

import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('[MathGenius crash]', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          padding: '2rem',
          background: '#faf9f7',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#78716c', marginBottom: '1.5rem', textAlign: 'center' }}>
            The app crashed. The error below will help fix it.
          </p>

          {/* Error message — this is what you paste to Claude */}
          <pre style={{
            background: '#1c1917',
            color: '#f87171',
            padding: '1rem 1.5rem',
            borderRadius: '0.75rem',
            fontSize: '0.8rem',
            maxWidth: '700px',
            width: '100%',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            marginBottom: '1.5rem',
          }}>
            {this.state.error?.toString()}
            {'\n\n'}
            {this.state.info?.componentStack}
          </pre>

          <button
            onClick={() => window.location.href = '/dashboard'}
            style={{
              background: '#0d9488',
              color: 'white',
              border: 'none',
              padding: '0.75rem 2rem',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              cursor: 'pointer',
              marginBottom: '0.75rem',
            }}
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'transparent',
              color: '#0d9488',
              border: '1px solid #0d9488',
              padding: '0.75rem 2rem',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              cursor: 'pointer',
            }}
          >
            Try Reloading
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
