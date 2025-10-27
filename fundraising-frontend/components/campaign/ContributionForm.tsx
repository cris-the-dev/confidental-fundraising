// components/campaign/ContributionForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useCampaigns } from '../../hooks/useCampaigns';
import { useFhevm } from '../../contexts/FhevmContext';
import { parseEther } from 'viem';
import Link from 'next/link';

interface Props {
  campaignId: number;
  onSuccess: () => void;
}

enum DecryptStatus {
  NONE = 0,
  PROCESSING = 1,
  DECRYPTED = 2,
}

// Cache key for localStorage
const VAULT_BALANCE_CACHE_KEY = 'vault_balance_cache';

interface BalanceCache {
  status: DecryptStatus;
  availableBalance: string;
  cacheExpiry: string;
  timestamp: number;
  userAddress: string;
}

export default function ContributeForm({ campaignId, onSuccess }: Props) {
  const { user, authenticated, login } = usePrivy();
  const { 
    contribute, 
    loading,
    getAvailableBalanceStatus,
    requestAvailableBalanceDecryption,
  } = useCampaigns();
  const { instance: fhevm, isInitialized, isLoading: fhevmLoading } = useFhevm();

  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Optional vault balance state (for display only, not required for contribution)
  const [vaultStatus, setVaultStatus] = useState<DecryptStatus>(DecryptStatus.NONE);
  const [availableBalance, setAvailableBalance] = useState<bigint | null>(null);
  const [cacheExpiry, setCacheExpiry] = useState<bigint>(0n);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Load cached balance on mount
  useEffect(() => {
    if (!authenticated || !user?.wallet?.address) return;

    const cached = localStorage.getItem(VAULT_BALANCE_CACHE_KEY);
    if (cached) {
      try {
        const cacheData: BalanceCache = JSON.parse(cached);
        
        // Only use cache if it's for the same user and less than 5 minutes old
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        if (
          cacheData.userAddress.toLowerCase() === user.wallet.address.toLowerCase() &&
          Date.now() - cacheData.timestamp < CACHE_DURATION
        ) {
          setVaultStatus(cacheData.status);
          setAvailableBalance(BigInt(cacheData.availableBalance));
          setCacheExpiry(BigInt(cacheData.cacheExpiry));
          setLastFetchTime(cacheData.timestamp);
          console.log('✅ Loaded balance from cache');
          return;
        }
      } catch (err) {
        console.error('Error loading cache:', err);
      }
    }
  }, [authenticated, user?.wallet?.address]);

  // Save to cache whenever balance updates
  useEffect(() => {
    if (!authenticated || !user?.wallet?.address || availableBalance === null) return;

    const cacheData: BalanceCache = {
      status: vaultStatus,
      availableBalance: availableBalance.toString(),
      cacheExpiry: cacheExpiry.toString(),
      timestamp: Date.now(),
      userAddress: user.wallet.address,
    };

    localStorage.setItem(VAULT_BALANCE_CACHE_KEY, JSON.stringify(cacheData));
  }, [vaultStatus, availableBalance, cacheExpiry, authenticated, user?.wallet?.address]);

  // Fetch vault balance status (rate-limited) - OPTIONAL for display
  const fetchVaultBalance = async () => {
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
      setVaultStatus(statusData.status);
      setAvailableBalance(statusData.availableAmount);
      setCacheExpiry(statusData.cacheExpiry);

      // Stop polling if decrypted
      if (statusData.status === DecryptStatus.DECRYPTED && statusData.availableAmount >= 0n) {
        if (pollingInterval) {
          clearInterval(pollingInterval);
          setPollingInterval(null);
        }
      }
    } catch (err: any) {
      console.error('Error fetching vault balance:', err);
      
      // If 429, show friendly message
      if (err.message?.includes('429') || err.message?.includes('rate limit')) {
        setError('Rate limit reached. Please wait a moment before checking balance again.');
      }
    }
  };

  // Manual balance check - OPTIONAL
  const handleCheckBalance = async () => {
    setCheckingBalance(true);
    setError(null);
    await fetchVaultBalance();
    setCheckingBalance(false);
  };

  // Setup polling ONLY when processing
  useEffect(() => {
    if (vaultStatus === DecryptStatus.PROCESSING) {
      const interval = setInterval(fetchVaultBalance, 10000);
      setPollingInterval(interval);

      return () => {
        clearInterval(interval);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultStatus]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const handleRequestBalanceDecryption = async () => {
    if (!authenticated) {
      login();
      return;
    }

    setCheckingBalance(true);
    setError(null);

    try {
      await requestAvailableBalanceDecryption();
      setVaultStatus(DecryptStatus.PROCESSING);

      // Start polling
      const interval = setInterval(fetchVaultBalance, 10000);
      setPollingInterval(interval);
    } catch (err: any) {
      console.error('Balance decryption error:', err);
      
      if (err.message?.includes('429') || err.message?.includes('rate limit')) {
        setError('Rate limit reached. Please wait a moment before trying again.');
      } else {
        setError('Failed to check vault balance. Please try again.');
      }
    } finally {
      setCheckingBalance(false);
    }
  };

  const isCacheExpired = () => {
    if (cacheExpiry === 0n) return false;
    return cacheExpiry < BigInt(Math.floor(Date.now() / 1000));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authenticated) {
      login();
      return;
    }

    if (!isInitialized) {
      setError('FHEVM is still initializing. Please wait a moment and try again.');
      return;
    }

    const amountNum = parseFloat(amount);

    if (!amount || amountNum <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    // Check uint64 max (~18.4 ETH)
    if (amountNum > 18.4) {
      setError('Amount too large. Maximum is ~18.4 ETH (uint64 limit)');
      return;
    }

    // ✅ NEW: No longer require balance decryption before contributing!
    // The contract will handle insufficient funds in encrypted form

    setError(null);
    setIsSubmitting(true); // Show loading immediately

    try {
      console.log(`💰 Contributing ${amount} ETH to campaign ${campaignId}`);

      await contribute(campaignId, amount);

      setSuccess(true);
      setAmount('');

      // Clear balance cache since contribution changed the locked amount
      localStorage.removeItem(VAULT_BALANCE_CACHE_KEY);
      setVaultStatus(DecryptStatus.NONE);
      setAvailableBalance(null);

      setTimeout(() => {
        setSuccess(false);
        onSuccess();
      }, 3000);

    } catch (err: any) {
      console.error('Contribution error:', err);

      let errorMessage = 'Failed to contribute. Please try again.';

      if (err.message?.includes('User has no balance')) {
        errorMessage = 'You have no balance in the vault. Please deposit first.';
      } else if (err.message?.includes('insufficient')) {
        errorMessage = 'Insufficient vault balance. Please deposit more funds.';
      } else if (err.message?.includes('user rejected') || err.message?.includes('denied')) {
        errorMessage = 'Transaction was cancelled.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false); // Clear loading state
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        Contribute to Campaign
      </h3>

      {/* Optional Vault Balance Section - For Display Only */}
      <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            💰 Your Vault Balance (Optional)
          </span>
          {vaultStatus === DecryptStatus.DECRYPTED && !isCacheExpired() && (
            <button
              onClick={handleCheckBalance}
              disabled={checkingBalance}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
            >
              🔄 Refresh
            </button>
          )}
        </div>

        {vaultStatus === DecryptStatus.NONE && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-sm text-gray-600">Balance Not Checked</span>
            </div>
            <button
              onClick={handleRequestBalanceDecryption}
              disabled={checkingBalance || !authenticated}
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
            >
              {checkingBalance ? 'Checking...' : '🔐 Check Vault Balance'}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Optional: Check your balance to see available funds
            </p>
          </div>
        )}

        {vaultStatus === DecryptStatus.PROCESSING && (
          <div className="flex items-center gap-3">
            <svg
              className="animate-spin h-4 w-4 text-blue-600"
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
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-900">Checking Balance...</span>
              </div>
              <p className="text-xs text-blue-700">Please wait 10-30 seconds</p>
            </div>
          </div>
        )}

        {vaultStatus === DecryptStatus.DECRYPTED && availableBalance !== null && (
          <div>
            {isCacheExpired() ? (
              <div>
                <p className="text-sm text-orange-600 mb-2">⚠️ Balance cache expired</p>
                <button
                  onClick={handleRequestBalanceDecryption}
                  disabled={checkingBalance}
                  className="text-sm bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 transition font-medium"
                >
                  Refresh Balance
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-700">Available</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {(Number(availableBalance) / 1e18).toFixed(4)} <span className="text-base font-medium">ETH</span>
                </p>
                {availableBalance === 0n && (
                  <Link
                    href="/vault"
                    className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    → Deposit to Vault
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contribution Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (ETH)
          </label>
          <input
            type="number"
            step="0.001"
            min="0.001"
            max="18"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1.0"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={loading}
          />
          {availableBalance !== null && vaultStatus === DecryptStatus.DECRYPTED && !isCacheExpired() && (
            <p className="text-xs text-gray-500 mt-1">
              Available: {(Number(availableBalance) / 1e18).toFixed(4)} ETH
            </p>
          )}
        </div>

        {/* FHEVM Loading State */}
        {fhevmLoading && (
          <div className="text-xs text-purple-700 bg-purple-50 p-3 rounded border border-purple-200">
            ⏳ Initializing encryption system...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
            {error.includes('deposit') && (
              <Link
                href="/vault"
                className="inline-block mt-2 text-sm text-red-700 hover:text-red-800 underline font-medium"
              >
                → Go to Vault to Deposit
              </Link>
            )}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              ✅ Contribution successful! Your funds are locked in the vault.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={
            loading ||
            isSubmitting ||
            !authenticated ||
            fhevmLoading ||
            !isInitialized
          }
          className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {(loading || isSubmitting) ? (
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
          ) : !authenticated ? (
            'Connect Wallet to Contribute'
          ) : fhevmLoading ? (
            'Initializing Encryption...'
          ) : (
            'Contribute (Encrypted)'
          )}
        </button>
      </form>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 mb-1">
          🔐 Your contribution amount is encrypted and private
        </p>
        <p className="text-xs text-gray-500 mb-1">
          ✅ No balance check required - the contract validates funds in encrypted form
        </p>
        <p className="text-xs text-gray-500">
          💡 Balance check is optional for display purposes only
        </p>
      </div>
    </div>
  );
}