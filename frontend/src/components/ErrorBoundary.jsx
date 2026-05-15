import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI error:', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', color: 'var(--text)', padding: 24, fontFamily: 'JetBrains Mono, monospace'
      }}>
        <div style={{
          maxWidth: 520, padding: 28, border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)',
          borderRadius: 8, background: 'var(--bg-2)'
        }}>
          <div style={{ fontSize: 12, letterSpacing: 2, color: 'var(--muted)', marginBottom: 8 }}>UI ERROR</div>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>Something broke on this page</h2>
          <pre style={{
            fontSize: 12, color: 'var(--muted)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            marginBottom: 18, maxHeight: 200, overflow: 'auto'
          }}>{String(this.state.error?.message || this.state.error)}</pre>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn" onClick={() => location.reload()}>Reload page</button>
            <button className="btn btn-ghost" onClick={this.reset}>Try again</button>
          </div>
        </div>
      </div>
    );
  }
}
