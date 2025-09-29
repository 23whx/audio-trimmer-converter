import { Component, type ReactNode } from 'react';
import { getCurrentLocale } from '../../lib/i18n/language-manager';
import { translations } from '../../lib/i18n/translations';

interface Props {
  fallback?: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // 记录错误，避免整页卸载
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const locale = getCurrentLocale();
      const t = translations[locale] || translations.en;
      
      return this.props.fallback ?? (
        <div className="rounded-lg border border-accent-dark/20 bg-primary p-4 text-sm text-neutral-dark">
          <div className="font-semibold text-accent-dark mb-1">{t.somethingWentWrong}</div>
          <div className="opacity-70 break-words">{this.state.error?.message}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;


