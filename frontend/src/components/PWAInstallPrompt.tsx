/**
 * PWAInstallPrompt Component
 * Prompts users to install the app as PWA
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Type definition for navigator.standalone (iOS Safari)
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useLocalStorage('pwa-install-dismissed', false);

  useEffect(() => {
    // Check if already installed
    const isInstalled =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as NavigatorWithStandalone).standalone === true;

    if (isInstalled || dismissed) {
      return;
    }

    // Listen for install prompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [dismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show install prompt
    deferredPrompt.prompt();

    // Wait for user choice
    const { outcome } = await deferredPrompt.userChoice;

    console.log(`User ${outcome === 'accepted' ? 'accepted' : 'dismissed'} the install prompt`);

    // Clear prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
  };

  if (!showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 max-w-sm animate-slide-up"
      role="dialog"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-description"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Dismiss install prompt"
        >
          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>

        {/* Icon */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
            <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0">
            <h3
              id="pwa-install-title"
              className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1"
            >
              Install Legal RAG
            </h3>
            <p
              id="pwa-install-description"
              className="text-xs text-gray-600 dark:text-gray-400 mb-3"
            >
              Install our app for quick access and offline support
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
