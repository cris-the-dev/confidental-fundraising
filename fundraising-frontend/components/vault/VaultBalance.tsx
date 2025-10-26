'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatEther } from 'viem';
import { usePrivy } from '@privy-io/react-auth';
import { useCampaigns } from '../../hooks/useCampaigns';

enum DecryptStatus {
  NONE = 0,
  PROCESSING = 1,
  DECRYPTED = 2,
}

// Cache key for localStorage to persist across page reloads
const VAULT_BALANCE_CACHE_KEY = 'vault_balance_cache_v2';

interface BalanceCache {
  status: DecryptStatus;
  availableBalance: string;
  cacheExpiry: string;
  timestamp: number;
  userAddress: string;
}

export function VaultBalance() {
  const [status, setStatus] = useState<DecryptStatus>(DecryptStatus.NONE);
  const [availableBalance, setAvailableBalance] = useState<bigint | null>(null);
  const [cacheExpiry, setCacheExpiry] = useState<bigint>(0n);
  const [error, setError] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const {
    getAvailableBalanceStatus,
    requestAvailableBalanceDecryption,
    loading,
  } = useCampaigns();
  const { authenticated, user } = usePrivy();

  // Load cached data from localStorage on mount
  useEffect(() => {
    if (!authenticated || !user?.wallet?.address) return;

    const cached = localStorage.getItem(VAULT_BALANCE_CACHE_KEY);
    if (cached) {
      try {
        const cacheData: BalanceCache = JSON.parse(cached);
        
        // Only use cache if it's for the same user and less than 10 minutes old
        const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
        if (
          cacheData.userAddress.toLowerCase() === user.wallet.address.toLowerCase() &&
          Date.now() - cacheData.timestamp < CACHE_DURATION
        ) {
          setStatus(cacheData.status);
          setAvailableBalance(BigInt(cacheData.availableBalance));
          setCacheExpiry(BigInt(cacheData.cacheExpiry));
          console.log('✅ Loaded vault balance from cache');
          return;
        } else {
          // Clear expired cache
          localStorage.removeItem(VAULT_BALANCE_CACHE_KEY);
        }
      } catch (err) {
        console.error('Error loading cache:', err);
        localStorage.removeItem(VAULT_BALANCE_CACHE_KEY);
      }
    }
  }, [authenticated, user?.wallet?.address]);

  // Save to cache whenever balance updates
  useEffect(() => {
    if (!authenticated || !user?.wallet?.address || availableBalance === null) return;

    const cacheData: BalanceCache = {
      status,
      availableBalance: availableBalance.toString(),
      cacheExpiry: cacheExpiry.toString(),
      timestamp: Date.now(),
      userAddress: user.wallet.address,
    };

    localStorage.setItem(VAULT_BALANCE_CACHE_KEY, JSON.stringify(cacheData));
  }, [status, availableBalance, cacheExpiry, authenticated, user?.wallet?.address]);

  const fetchStatus = useCallback(async () => {
    if (!authenticated || !user?.wallet?.address) return;

    // Rate limiting: Don't fetch more than once every 10 seconds
    const MIN_FETCH_INTERVAL = 10000; // 10 seconds
    const now = Date.now();
    if (now - lastFetchTime < MIN_FETCH_INTERVAL) {
      console.log('⏱️ Rate limited: Skipping fetch (too soon)');
      return;
    }

    try {
      setLastFetchTime(now);
      const statusData = await getAvailableBalanceStatus();

      setStatus(statusData.status);
      setAvailableBalance(statusData.availableAmount);
      setCacheExpiry(statusData.cacheExpiry);

      // If status is DECRYPTED and we have data, stop polling
      if (statusData.status === DecryptStatus.DECRYPTED && statusData.availableAmount >= 0n) {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      }
    } catch (err: any) {
      console.error('Error fetching status:', err);
      
      // Handle rate limiting gracefully
      if (err.message?.includes('429') || err.message?.includes('rate limit')) {
        setError('Rate limit reached. Please wait a moment.');
        // Stop polling if rate limited
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      }
    }
  }, [authenticated, user?.wallet?.address, getAvailableBalanceStatus, pollingInterval, lastFetchTime]);

  // Initial fetch ONLY on mount, and ONLY if we need to poll
  useEffect(() => {
    // Don't fetch if we just loaded from cache and status is DECRYPTED
    if (status === DecryptStatus.DECRYPTED && availableBalance !== null) {
      return;
    }

    // Only fetch initially if we don't have cached data
    if (status === DecryptStatus.NONE && availableBalance === null) {
      fetchStatus();
    }

    // Only start polling if status is PROCESSING
    if (status === DecryptStatus.PROCESSING) {
      // Slower polling: every 10 seconds to avoid rate limits
      const interval = setInterval(fetchStatus, 10000);
      setPollingInterval(interval);

      return () => {
        clearInterval(interval);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]); // Only depend on status, not fetchStatus

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

    setError('');
    setIsRequesting(true);

    try {
      console.log('📝 Requesting balance decryption...');
      await requestAvailableBalanceDecryption();

      setStatus(DecryptStatus.PROCESSING);

      // Start slower polling (10 seconds)
      const interval = setInterval(fetchStatus, 10000);
      setPollingInterval(interval);

      console.log('✅ Decryption requested! Waiting for gateway...');
    } catch (err: any) {
      console.error('❌ Request error:', err);

      if (err.message?.includes('DecryptAlreadyInProgress')) {
        setError('Decryption already in progress. Please wait...');
        setStatus(DecryptStatus.PROCESSING);
        
        // Start polling since decryption is in progress
        const interval = setInterval(fetchStatus, 10000);
        setPollingInterval(interval);
      } else if (err.message?.includes('No balance')) {
        setError('No balance found in vault. Please deposit first.');
      } else if (err.message?.includes('429') || err.message?.includes('rate limit')) {
        setError('Rate limit reached. Please wait a moment before trying again.');
      } else {
        setError(err.message || 'Failed to request decryption');
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRefresh = async () => {
    setError('');

    if (isCacheExpired() && status === DecryptStatus.DECRYPTED) {
      // Cache expired - request new decryption
      setIsRequesting(true);
      try {
        console.log('🔄 Cache expired, requesting new decryption...');
        await requestAvailableBalanceDecryption();

        setStatus(DecryptStatus.PROCESSING);

        // Start polling
        const interval = setInterval(fetchStatus, 10000);
        setPollingInterval(interval);

        console.log('✅ Re-decryption requested!');
      } catch (err: any) {
        console.error('❌ Re-decryption error:', err);
        
        if (err.message?.includes('429') || err.message?.includes('rate limit')) {
          setError('Rate limit reached. Please wait a moment.');
        } else {
          setError(err.message || 'Failed to request re-decryption');
        }
      } finally {
        setIsRequesting(false);
      }
    } else {
      // Just refresh data (respects rate limiting)
      await fetchStatus();
    }
  };

  const isCacheExpired = () => {
    if (cacheExpiry === 0n) return false;
    return cacheExpiry < BigInt(Math.floor(Date.now() / 1000));
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          💰 Available Balance
        </h3>

        <div className="flex gap-2">
          {status === DecryptStatus.NONE && (
            <button
              onClick={handleRequestDecryption}
              disabled={isRequesting || loading || !authenticated}
              className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
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
                '🔐 View Balance'
              )}
            </button>
          )}

          {status === DecryptStatus.DECRYPTED && (
            <button
              onClick={handleRefresh}
              disabled={isRequesting || loading}
              className="text-xs bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
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
                  Refreshing...
                </span>
              ) : isCacheExpired() ? (
                '🔄 Re-decrypt'
              ) : (
                '🔄 Refresh'
              )}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-800">❌ {error}</p>
        </div>
      )}

      {/* Status-based content */}
      {status === DecryptStatus.NONE && (
        <div className="bg-white rounded-lg p-4 border border-blue-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">
              Encrypted
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Your available balance is encrypted. Click View Balance to decrypt and see how much you can withdraw.
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
                  Decrypting Balance...
                </span>
              </div>
              <p className="text-xs text-blue-700">
                Please wait 10-30 seconds while the decryption gateway processes your request.
              </p>
            </div>
          </div>

          <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-600 h-1.5 rounded-full animate-progress"></div>
          </div>
        </div>
      )}

      {status === DecryptStatus.DECRYPTED && availableBalance !== null && (
        <div className="bg-white rounded-lg p-5 border border-blue-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs font-medium text-green-700">
              ✅ Decrypted
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <span className="text-4xl font-bold text-blue-900">
              {formatEther(availableBalance)}
            </span>
            <span className="text-lg text-blue-700 font-medium">ETH</span>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-gray-500">
              {availableBalance.toString()} Wei
            </p>

            {isCacheExpired() && (
              <p className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                ⚠️ Cache expired - click refresh to decrypt again
              </p>
            )}

            {!isCacheExpired() && (
              <p className="text-xs text-blue-600">
                🔒 This is your withdrawable balance (cached for 10 minutes)
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          💡 Balance is cached locally and polls every 10 seconds during decryption
        </p>
      </div>
    </div>
  );
}