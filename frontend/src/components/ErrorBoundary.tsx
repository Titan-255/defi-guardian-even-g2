import React from 'react';

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || 'Unexpected rendering error' };
  }

  componentDidCatch(error: Error) {
    console.error('[DeFi Guardian ErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050806] text-[#e0f2e9] font-mono flex items-center justify-center p-4">
          <div className="max-w-md w-full border border-[#1a3322] bg-[#0a120c] rounded-xl p-6 text-center space-y-3">
            <h1 className="text-base font-bold text-[#00e676]">DEFI GUARDIAN — RECOVERY</h1>
            <p className="text-xs text-[#81c784]">{this.state.errorMessage}</p>
            <button
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
              className="bg-[#00e676] text-black font-bold text-xs px-4 py-2 rounded hover:bg-[#69f0ae] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#69f0ae]"
            >
              Retry Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
