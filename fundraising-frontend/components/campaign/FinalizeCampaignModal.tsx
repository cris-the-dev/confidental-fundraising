'use client';

import { useState, useEffect } from 'react';
import { useCampaigns } from '../../hooks/useCampaigns';
import { DecryptStatus } from '../../types';

interface Props {
  campaignId: number;
  campaignTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function FinalizeCampaignModal({
  campaignId,
  campaignTitle,
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const {
    finalizeCampaign,
    getTotalRaisedStatus,
    requestTotalRaisedDecryption,
    loading
  } = useCampaigns();
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [finalizingStep, setFinalizingStep] = useState<string>('');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const waitForTotalRaisedDecryption = async (): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 24; // 24 * 5 seconds = 2 minutes max

      const interval = setInterval(async () => {
        attempts++;

        try {
          const status = await getTotalRaisedStatus(campaignId);

          const currentTimeMillis = Date.now();
          const statusCacheExp = status.cacheExpiry;

          if (status.status === DecryptStatus.DECRYPTED && status.totalRaised >= 0n && statusCacheExp > BigInt(currentTimeMillis)) {
            clearInterval(interval);
            setPollingInterval(null);
            resolve(true);
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            setPollingInterval(null);
            reject(new Error('Decryption timeout - please try again'));
          }
        } catch (err) {
          console.error('Error checking total raised decryption status:', err);
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            setPollingInterval(null);
            reject(err);
          }
        }
      }, 5000); // Poll every 5 seconds

      setPollingInterval(interval);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!tokenName.trim()) {
      setError('Token name is required');
      return;
    }

    if (!tokenSymbol.trim()) {
      setError('Token symbol is required');
      return;
    }

    if (tokenSymbol.length > 10) {
      setError('Token symbol should be 10 characters or less');
      return;
    }

    if (!/^[A-Za-z0-9]+$/.test(tokenSymbol)) {
      setError('Token symbol should only contain letters and numbers');
      return;
    }

    try {
      setError(null);

      // Step 1: Check if total raised is decrypted
      setFinalizingStep('Checking total raised status...');
      const totalRaisedStatus = await getTotalRaisedStatus(campaignId);

      // Step 2: If not decrypted, request decryption
      if (totalRaisedStatus.status === DecryptStatus.NONE || (totalRaisedStatus.status === DecryptStatus.DECRYPTED && totalRaisedStatus.totalRaised < 0n)) {
        setFinalizingStep('Total raised needs to be decrypted first...');
        await requestTotalRaisedDecryption(campaignId);

        // Wait and poll for decryption to complete
        setFinalizingStep('Waiting for decryption (10-30 seconds)...');
        await waitForTotalRaisedDecryption();
      } else if (totalRaisedStatus.status === DecryptStatus.PROCESSING) {
        setFinalizingStep('Decryption already in progress, waiting...');
        await waitForTotalRaisedDecryption();
      }

      // Step 3: Finalize campaign
      setFinalizingStep('Finalizing campaign...');
      await finalizeCampaign(campaignId, tokenName.trim(), tokenSymbol.trim().toUpperCase());

      setFinalizingStep('');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Finalize error:', err);

      let errorMessage = err.message || 'Failed to finalize campaign';

      if (err.message?.includes('Must decrypt total raised first')) {
        errorMessage = 'Unable to decrypt total raised. Please try again.';
      } else if (err.message?.includes('CampaignStillActive')) {
        errorMessage = 'Campaign deadline has not passed yet';
      } else if (err.message?.includes('Decryption timeout')) {
        errorMessage = 'Decryption took too long. Please try again.';
      } else if (err.message?.includes('OnlyOwner')) {
        errorMessage = 'Only the campaign owner can finalize';
      }

      setError(errorMessage);
      setFinalizingStep('');

      // Cleanup polling
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  };

  const handleClose = () => {
    if (!loading && !finalizingStep) {
      setTokenName('');
      setTokenSymbol('');
      setError(null);
      setFinalizingStep('');
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          {/* Close button */}
          <button
            onClick={handleClose}
            disabled={loading}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🎉</span>
              <h2 className="text-2xl font-bold text-gray-900">
                Finalize Campaign
              </h2>
            </div>
            <p className="text-sm text-gray-600">
              {campaignTitle}
            </p>
          </div>

          {/* Progress Indicator */}
          {finalizingStep && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <svg
                  className="animate-spin h-5 w-5 text-blue-600 flex-shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">{finalizingStep}</p>
                  <p className="text-xs text-blue-700">Please wait, do not close this window</p>
                </div>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex gap-3">
              <span className="text-yellow-600 flex-shrink-0">⚠️</span>
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Important:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Total raised will be automatically decrypted if needed</li>
                  <li>If target is reached, contributors will receive tokens</li>
                  <li>If target is not reached, funds will be unlocked (campaign fails)</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token Name *
              </label>
              <input
                type="text"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="e.g., My Campaign Token"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={loading}
                maxLength={50}
              />
              <p className="text-xs text-gray-500 mt-1">
                Full name of the token (max 50 characters)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token Symbol *
              </label>
              <input
                type="text"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                placeholder="e.g., MCT"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase"
                disabled={loading}
                maxLength={10}
              />
              <p className="text-xs text-gray-500 mt-1">
                Short ticker symbol (e.g., ETH, BTC, USDT) - max 10 characters
              </p>
            </div>

            {/* Token Info */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-purple-900 mb-2">
                Token Distribution
              </h4>
              <ul className="text-xs text-purple-800 space-y-1">
                <li>• Total Supply: 1,000,000,000 tokens</li>
                <li>• Distribution: Proportional to contribution vs target</li>
                <li>• Standard: ERC-20 compliant</li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading || !!finalizingStep}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !!finalizingStep || !tokenName.trim() || !tokenSymbol.trim()}
                className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || finalizingStep ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Finalize Campaign'
                )}
              </button>
            </div>
            {!finalizingStep && (
              <p className="text-xs text-gray-500 text-center">
                💡 Total raised will be automatically decrypted if needed
              </p>
            )}
          </form>

          {/* Examples */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">💡 Examples:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-50 rounded p-2">
                <p className="text-gray-600">Name: <span className="font-medium">EcoProject Token</span></p>
                <p className="text-gray-600">Symbol: <span className="font-medium">ECO</span></p>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="text-gray-600">Name: <span className="font-medium">Tech Startup Coin</span></p>
                <p className="text-gray-600">Symbol: <span className="font-medium">TSC</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}