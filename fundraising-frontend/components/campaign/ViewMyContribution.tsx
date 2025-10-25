'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatEther } from 'viem';
import { usePrivy } from '@privy-io/react-auth';
import { useCampaigns } from '../../hooks/useCampaigns';

interface Props {
  campaignId: number;
}

enum DecryptStatus {
  NONE = 0,
  PROCESSING = 1,
  DECRYPTED = 2,
}

export function ViewMyContribution({ campaignId }: Props) {
  const [status, setStatus] = useState<DecryptStatus>(DecryptStatus.NONE);
  const [contribution, setContribution] = useState<bigint | null>(null);
  const [cacheExpiry, setCacheExpiry] = useState<bigint>(0n);
  const [hasContrib, setHasContrib] = useState(false);
  const [error, setError] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const {
    getContributionStatus,
    checkHasContribution,
    requestMyContributionDecryption,
    loading,
  } = useCampaigns();
  const { authenticated, user } = usePrivy();

  const fetchStatus = useCallback(async () => {
    if (!authenticated || !user?.wallet?.address) return;

    try {
      const [statusData, hasContribution] = await Promise.all([
        getContributionStatus(campaignId, user.wallet.address),
        checkHasContribution(campaignId, user.wallet.address),
      ]);

      setStatus(statusData.status);
      setContribution(statusData.contribution);
      setCacheExpiry(statusData.cacheExpiry);
      setHasContrib(hasContribution);

      // If status is DECRYPTED and we have data, stop polling
      if (statusData.status === DecryptStatus.DECRYPTED && statusData.contribution > 0n) {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      }
    } catch (err) {
      console.error('Error fetching status:', err);
    }
  }, [authenticated, user?.wallet?.address, campaignId, getContributionStatus, checkHasContribution, pollingInterval]);

  // Initial fetch and setup polling when status is PROCESSING
  useEffect(() => {
    fetchStatus();

    // If processing, start polling every 5 seconds
    if (status === DecryptStatus.PROCESSING) {
      const interval = setInterval(fetchStatus, 5000);
      setPollingInterval(interval);

      return () => {
        clearInterval(interval);
      };
    }
  }, [campaignId, authenticated, user?.wallet?.address, status, fetchStatus]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const handleRequestDecryption = async () => {
    if (!authenticated) {
      alert('Please connect your wallet');
      return;
    }

    if (!hasContrib) {
      setError("You haven't contributed to this campaign yet.");
      return;
    }

    setError('');
    setIsRequesting(true);

    try {
      console.log('📝 Requesting decryption...');
      await requestMyContributionDecryption(campaignId);

      // Update status to PROCESSING immediately for better UX
      setStatus(DecryptStatus.PROCESSING);

      // Start polling for status updates
      const interval = setInterval(fetchStatus, 5000);
      setPollingInterval(interval);

      console.log('✅ Decryption requested! Waiting for gateway...');
    } catch (err: any) {
      console.error('❌ Request error:', err);

      if (err.message?.includes('DecryptAlreadyInProgress')) {
        setError('Decryption already in progress. Please wait...');
        setStatus(DecryptStatus.PROCESSING);
      } else if (err.message?.includes('ContributionNotFound')) {
        setError("You haven't contributed to this campaign yet.");
      } else {
        setError(err.message || 'Failed to request decryption');
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRefresh = async () => {
    setError('');

    // Check if cache is expired
    if (isCacheExpired() && status === DecryptStatus.DECRYPTED) {
      // Cache expired - request new decryption
      setIsRequesting(true);
      try {
        console.log('🔄 Cache expired, requesting new decryption...');
        await requestMyContributionDecryption(campaignId);

        setStatus(DecryptStatus.PROCESSING);

        // Start polling for status updates
        const interval = setInterval(fetchStatus, 5000);
        setPollingInterval(interval);

        console.log('✅ Re-decryption requested! Waiting for gateway...');
      } catch (err: any) {
        console.error('❌ Re-decryption error:', err);

        if (err.message?.includes('DecryptAlreadyInProgress')) {
          setError('Decryption already in progress. Please wait...');
          setStatus(DecryptStatus.PROCESSING);
        } else {
          setError(err.message || 'Failed to request re-decryption');
        }
      } finally {
        setIsRequesting(false);
      }
    } else {
      await fetchStatus();
    }
  };

  // Check if cache is expired
  const isCacheExpired = () => {
    if (cacheExpiry === 0n) return false;
    return cacheExpiry < BigInt(Math.floor(Date.now() / 1000));
  };

  // Don't show if user hasn't contributed
  if (!hasContrib && status === DecryptStatus.NONE) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-600 text-center">
          💡 You have not contributed to this campaign yet
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-blue-900">
          👤 Your Contribution
        </span>

        {/* Action buttons based on status */}
        <div className="flex gap-2">
          {status === DecryptStatus.NONE && hasContrib && (
            <button
              onClick={handleRequestDecryption}
              disabled={isRequesting || loading || !authenticated}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
            >
              {isRequesting ? (
                <span className="flex items-center gap-1">
                  <svg
                    className="animate-spin h-3 w-3"
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
                  Requesting...
                </span>
              ) : (
                '🔐 Decrypt My Amount'
              )}
            </button>
          )}

          {status === DecryptStatus.DECRYPTED && (
            <button
              onClick={handleRefresh}
              className="text-xs bg-gray-500 text-white px-3 py-1.5 rounded-lg hover:bg-gray-600 transition font-medium"
            >
              🔄 Refresh
            </button>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-800">❌ {error}</p>
        </div>
      )}

      {/* Status-based content */}
      {status === DecryptStatus.NONE && hasContrib && (
        <div className="bg-white rounded-lg p-3 border border-blue-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">
              Encrypted
            </span>
          </div>
          <p className="text-xs text-gray-600">
            Your contribution is encrypted on-chain. Click the button above to decrypt and view your amount.
          </p>
        </div>
      )}

      {status === DecryptStatus.PROCESSING && (
        <div className="bg-white rounded-lg p-4 border border-blue-300">
          <div className="flex items-center gap-3 mb-3">
            <svg
              className="animate-spin h-5 w-5 text-blue-600"
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
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-900">
                  Decrypting...
                </span>
              </div>
              <p className="text-xs text-blue-700">
                Please wait 10-30 seconds while the decryption gateway processes your request.
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-600 h-1.5 rounded-full animate-progress"></div>
          </div>
        </div>
      )}

      {status === DecryptStatus.DECRYPTED && contribution !== null && (
        <div className="bg-white rounded-lg p-4 border border-blue-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs font-medium text-green-700">
              ✅ Decrypted
            </span>
          </div>

          {contribution > 0n ? (
            <>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-3xl font-bold text-blue-900">
                  {formatEther(contribution)}
                </span>
                <span className="text-sm text-blue-700 font-medium">ETH</span>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-500">
                  {contribution.toString()} Wei
                </p>

                {isCacheExpired() && (
                  <p className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                    ⚠️ Cache expired - click refresh to decrypt again
                  </p>
                )}

                {!isCacheExpired() && (
                  <p className="text-xs text-blue-600">
                    🔒 Only you can see this amount (cached for 10 minutes)
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-600">
              💡 You have not contributed yet, or your contribution is 0
            </p>
          )}
        </div>
      )}
    </div>
  );
}