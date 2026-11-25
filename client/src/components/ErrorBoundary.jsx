import React from 'react';

/**
 * Top-level React Error Boundary.
 * Prevents unhandled render/lifecycle errors from leaving a silent blank screen,
 * while surfacing the exact underlying error in both the console and fallback UI.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      componentStack: '',
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[Padhaku Billa ErrorBoundary]', error, errorInfo);
    this.setState({
      componentStack: errorInfo?.componentStack || '',
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetSessionAndReload = () => {
    try {
      localStorage.removeItem('lifelevel_token');
    } catch {
      // Ignore storage access errors
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, componentStack } = this.state;
    const errorTitle = error?.name || 'Error';
    const errorMessage = error?.message || String(error || 'An unexpected rendering error occurred.');

    return (
      <div className="min-h-screen bg-[#F6FAF7] dark:bg-[#0A0F0D] text-[#1C2A24] dark:text-[#F2F7F4] flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white dark:bg-[#162420] border border-[#EAE5DD] dark:border-[#253D35] rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
          <div className="flex items-center space-x-3">
            <img
              src="/padhaku_billa logo.jpeg"
              alt="Padhaku Billa Logo"
              className="w-11 h-11 rounded-2xl object-cover border border-[#EAE5DD] dark:border-[#253D35]"
            />
            <div>
              <h1 className="text-lg font-black tracking-tight">Something went wrong</h1>
              <p className="text-xs text-[#576560] dark:text-[#8BA398] font-medium">
                Padhaku Billa hit an unexpected error while rendering this view.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-mono break-words space-y-1">
            <div className="font-bold">
              {errorTitle}: {errorMessage}
            </div>
            {(error?.stack || componentStack) && (
              <details className="pt-1 text-[11px] opacity-85">
                <summary className="cursor-pointer font-sans font-semibold select-none">
                  Technical details
                </summary>
                <pre className="mt-2 whitespace-pre-wrap overflow-x-auto max-h-48 text-[10px] leading-relaxed">
                  {error?.stack || ''}
                  {componentStack ? `\nComponent stack:${componentStack}` : ''}
                </pre>
              </details>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={this.handleReload}
              className="flex-1 px-5 py-3 rounded-2xl bg-[#1B3B2F] hover:bg-[#142C23] text-white text-xs font-black transition cursor-pointer"
            >
              Reload Page
            </button>
            <button
              type="button"
              onClick={this.handleResetSessionAndReload}
              className="px-5 py-3 rounded-2xl border border-[#EAE5DD] dark:border-[#253D35] text-xs font-bold text-[#576560] dark:text-[#9EB5AB] hover:bg-[#FAF8F5] dark:hover:bg-[#1C2E29] transition cursor-pointer"
            >
              Sign Out &amp; Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
