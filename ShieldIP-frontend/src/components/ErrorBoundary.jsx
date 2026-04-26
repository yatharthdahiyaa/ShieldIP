import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ShieldIP] Component error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="text-primary text-4xl mb-4">⚠</div>
          <h2 className="font-display font-bold text-white text-xl mb-2">Something went wrong</h2>
          <p className="text-[#555] text-[13px] mb-6">{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
