import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  override render() {
    if (this.state.hasError) {
      let readable = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed?.error) {
          readable = `${parsed.error} (${parsed.operationType} on ${parsed.path || 'database'})`;
        }
      } catch {
        // Keep original message
      }

      return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#080E1E] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white dark:bg-[#101D42] border border-slate-200 dark:border-white/15 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Something went wrong</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 break-words">{readable}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 px-4 py-2 text-sm font-medium text-white bg-[#1769E8] rounded-xl hover:bg-[#1358C7] transition-colors cursor-pointer"
            >
              Reload TAYSSIR
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
