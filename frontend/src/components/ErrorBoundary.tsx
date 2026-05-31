import { Component, type ReactNode } from 'react';
import { withTranslation } from 'react-i18next';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
  t: (key: string) => string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const { t } = this.props;
      return (
        <div className="min-h-screen bg-[#f0ebe3] dark:bg-[#0F0F10] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1F1F21] rounded-xl shadow-sm p-8 max-w-md text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-[#E5E5E7] mb-2">{t('error.title')}</h1>
            <p className="text-gray-600 dark:text-[#98989D] mb-4">{t('error.message')}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-[#e8673a] text-white rounded-lg hover:bg-[#d15a2f]"
            >
              {t('error.refresh')}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default withTranslation('common')(ErrorBoundary);
