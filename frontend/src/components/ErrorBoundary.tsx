import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Uncaught Frontend Exception]", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen w-full bg-canvas text-ink p-6 text-center select-none font-sans">
          <div className="max-w-md w-full p-6 rounded-2xl bg-white dark:bg-[#14151a] border border-black/10 dark:border-white/10 shadow-2xl flex flex-col items-center gap-4">
            <div className="size-12 rounded-full bg-[#2E6B5E]/10 border border-[#2E6B5E]/20 flex items-center justify-center text-[#2E6B5E] dark:text-[#10b981]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink dark:text-white mb-1">
                Session Recovered
              </h2>
              <p className="text-xs text-ink-3 dark:text-zinc-400 leading-relaxed">
                An unexpected interface state occurred. Your chat history and preferences remain safely saved.
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleReload}
              className="px-4 py-2 rounded-xl bg-[#2E6B5E] dark:bg-[#10b981] dark:text-zinc-950 text-white font-bold text-xs shadow-md hover:opacity-90 transition-opacity cursor-pointer"
            >
              Refresh Chat Interface
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
