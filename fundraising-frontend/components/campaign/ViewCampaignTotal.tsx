'use client';

import { useState, useEffect } from 'react';
import { formatEther } from 'viem';
import { usePrivy } from '@privy-io/react-auth';
import { useCampaigns } from '../../hooks/useCampaigns';
import { useFhevm } from '../../contexts/FhevmContext';
import { DecryptStatus } from '../../types';

interface Props {
  campaignId: number;
  isOwner: boolean;
}

export function ViewCampaignTotal({ campaignId, isOwner }: Props) {
  const [status, setStatus] = useState<DecryptStatus>(DecryptStatus.NONE);
  const [totalRaised, setTotalRaised] = useState<bigint | null>(null);
  const [cacheExpiry, setCacheExpiry] = useState<bigint>(0n);
  const [error, setError] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const {
    getTotalRaisedStatus,
    requestTotalRaisedDecryption,
    loading,
  } = useCampaigns();
  const { isInitialized, isLoading: fhevmLoading } = useFhevm();
  const { authenticated } = usePrivy();

  // Fetch total raised status
  const fetchStatus = async () => {
    if (!authenticated || !isOwner) return;

    try {
      const statusData = await getTotalRaisedStatus(campaignId);

      setStatus(statusData.status);
      setTotalRaised(statusData.totalRaised);
      setCacheExpiry(statusData.cacheExpiry);

      // If status is DECRYPTED and we have data, stop polling
      if (statusData.status === DecryptStatus.DECRYPTED && statusData.totalRaised > 0n) {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      }
    } catch (err: any) {
      console.error('Error fetching status:', err);
      // Don't show error for owner-only checks
      if (!err.message?.includes('OnlyOwner')) {
        setError('Failed to fetch status');
      }
    }
  };

  // Initial fetch and setup polling when status is PROCESSING
  useEffect(() => {
    if (isOwner) {
      fetchStatus();

      // If processing, start polling every 5 seconds
      if (status === DecryptStatus.PROCESSING) {
        const interval = setInterval(fetchStatus, 5000);
        setPollingInterval(interval);

        return () => {
          clearInterval(interval);
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, authenticated, isOwner, status]);

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

    if (!isInitialized) {
      setError('FHEVM is still initializing. Please wait a moment and try again.');
      return;
    }

    if (!isOwner) {
      setError('Only the campaign owner can decrypt the total raised.');
      return;
    }

    setError('');
    setIsRequesting(true);

    try {
      console.log('📝 Requesting total decryption...');
      await requestTotalRaisedDecryption(campaignId);

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
      } else if (err.message?.includes('OnlyOwner')) {
        setError('Only the campaign owner can request this decryption.');
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
        await requestTotalRaisedDecryption(campaignId);

        setStatus(DecryptStatus.PROCESSING);

        const interval = setInterval(fetchStatus, 5000);
        setPollingInterval(interval);

        console.log('✅ Re-decryption requested! Waiting for gateway...');
      } catch (err: any) {
        console.error('❌ Re-decryption error:', err);

        if (err.message?.includes('DecryptAlreadyInProgress')) {
          setError('Decryption already in progress. Please wait...');
          setStatus(DecryptStatus.PROCESSING);
        } else if (err.message?.includes('OnlyOwner')) {
          setError('Only the campaign owner can request this decryption.');
        } else {
          setError(err.message || 'Failed to request re-decryption');
        }
      } finally {
        setIsRequesting(false);
      }
    } else {
      // Cache still valid - just refresh the data
      await fetchStatus();
    }
  };

  // Check if cache is expired
  const isCacheExpired = () => {
    if (cacheExpiry === 0n) return false;
    return cacheExpiry < BigInt(Math.floor(Date.now() / 1000));
  };

  // Don't show anything if not owner
  if (!isOwner) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-600 text-center">
          🔒 Total raised amount is private (only visible to campaign owner)
        </p>
      </div>
    );
  }

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-purple-900">
          💰 Campaign Total Raised
        </span>

        {/* Action buttons based on status */}
        <div className="flex gap-2">
          {status === DecryptStatus.NONE && (
            <button
              onClick={handleRequestDecryption}
              disabled={isRequesting || loading || !authenticated || fhevmLoading || !isInitialized}
              className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
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
                '🔐 Decrypt Total Raised'
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

      {/* FHEVM Loading State */}
      {fhevmLoading && (
        <div className="mb-3 bg-purple-100 border border-purple-200 rounded-lg p-3">
          <p className="text-xs text-purple-800">
            ⏳ Initializing encryption system...
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-800">❌ {error}</p>
        </div>
      )}

      {/* Status-based content */}
      {status === DecryptStatus.NONE && (
        <div className="bg-white rounded-lg p-3 border border-purple-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">
              Encrypted
            </span>
          </div>
          <p className="text-xs text-gray-600">
            Campaign total is encrypted on-chain. Click the button above to decrypt and view the total amount raised.
          </p>
        </div>
      )}

      {status === DecryptStatus.PROCESSING && (
        <div className="bg-white rounded-lg p-4 border border-purple-300">
          <div className="flex items-center gap-3 mb-3">
            <svg
              className="animate-spin h-5 w-5 text-purple-600"
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
                <span className="text-sm font-medium text-purple-900">
                  Decrypting...
                </span>
              </div>
              <p className="text-xs text-purple-700">
                Please wait 10-30 seconds while the decryption gateway processes your request.
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="w-full bg-purple-200 rounded-full h-1.5 overflow-hidden">
            <div className="bg-purple-600 h-1.5 rounded-full animate-progress"></div>
          </div>
        </div>
      )}

      {status === DecryptStatus.DECRYPTED && totalRaised !== null && (
        <div className="bg-white rounded-lg p-4 border border-purple-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs font-medium text-green-700">
              ✅ Decrypted
            </span>
          </div>

          {totalRaised > 0n ? (
            <>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-3xl font-bold text-purple-900">
                  {formatEther(totalRaised)}
                </span>
                <span className="text-sm text-purple-700 font-medium">ETH</span>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-500">
                  {totalRaised.toString()} Wei
                </p>

                {isCacheExpired() && (
                  <p className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                    ⚠️ Cache expired - click refresh to decrypt again
                  </p>
                )}

                {!isCacheExpired() && (
                  <p className="text-xs text-purple-600">
                    🔒 Only you (campaign owner) can see this amount (cached for 10 minutes)
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-600">
              💡 No contributions yet, or total is 0
            </p>
          )}
        </div>
      )}
    </div>
  );
}