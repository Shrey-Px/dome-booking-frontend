// src/components/ErrorBoundary.js - Error Boundary for React components
import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Send error to logging service (if configured)
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: true
      });
    }

    // You can also log to an external service
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    // Reset error state and reload
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    // Reset error state and navigate to home
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Too many errors in a row - something is seriously wrong
      if (this.state.errorCount > 3) {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Critical Error
                </h1>
                
                <p className="text-gray-600 mb-6">
                  The application has encountered multiple errors. Please contact support if this issue persists.
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => window.location.href = '/'}
                    className="w-full bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
                  >
                    <Home className="w-5 h-5 mr-2" />
                    Go to Home
                  </button>
                  
                  <a
                    href="mailto:support@domesports.com"
                    className="block w-full border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg transition-colors text-center"
                  >
                    Contact Support
                  </a>
                </div>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-6 text-left">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                      Show Error Details (Development Only)
                    </summary>
                    <div className="mt-2 p-4 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-64">
                      <div className="text-red-600 font-bold mb-2">{this.state.error.toString()}</div>
                      <div className="text-gray-700">{this.state.errorInfo.componentStack}</div>
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        );
      }

      // Render error UI for single/few errors
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Something went wrong
              </h1>
              
              <p className="text-gray-600 mb-6">
                {this.props.fallbackMessage || 
                  "We're sorry, but something unexpected happened. Please try reloading the page."}
              </p>

              <div className="space-y-3">
                <button
                  onClick={this.handleReload}
                  className="w-full bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Reload Page
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg transition-colors flex items-center justify-center"
                >
                  <Home className="w-5 h-5 mr-2" />
                  Go to Home
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    Show Error Details (Development Only)
                  </summary>
                  <div className="mt-2 p-4 bg-gray-100 rounded text-xs font-mono overflow-auto max-h-64">
                    <div className="text-red-600 font-bold mb-2">{this.state.error.toString()}</div>
                    <div className="text-gray-700 whitespace-pre-wrap">{this.state.errorInfo.componentStack}</div>
                  </div>
                </details>
              )}

              <p className="mt-6 text-xs text-gray-500">
                If this problem persists, please contact support at support@domesports.com
              </p>
            </div>
          </div>
        </div>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;