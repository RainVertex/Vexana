import { Component, type ReactNode, type ErrorInfo } from "react";
import { useTranslation } from "react-i18next";

interface BaseProps {
  children: ReactNode;
  fallbackTitle: string;
}

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  error: Error | null;
}

class ErrorBoundaryBase extends Component<BaseProps, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-md border border-app-danger bg-app-surface px-3 py-2 text-sm text-app-danger">
          <div className="font-semibold">{this.props.fallbackTitle}</div>
          <div className="mt-1 text-xs">{this.state.error.message}</div>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[10px] text-app-text-muted">
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ErrorBoundary({ children, fallbackTitle }: Props) {
  const { t } = useTranslation("projects");
  return (
    <ErrorBoundaryBase fallbackTitle={fallbackTitle ?? t("error.somethingWentWrong")}>
      {children}
    </ErrorBoundaryBase>
  );
}
