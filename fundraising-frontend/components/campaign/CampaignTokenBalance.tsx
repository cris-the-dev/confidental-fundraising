'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useErc20 } from '../../hooks/useErc20';

interface Props {
  tokenAddress: string;
  campaignTitle: string;
}

export function CampaignTokenBalance({ tokenAddress, campaignTitle }: Props) {
  const { user, authenticated } = usePrivy();
  const { getTokenBalance, getTokenInfo } = useErc20();

  const [balance, setBalance] = useState<bigint | null>(null);
  const [tokenInfo, setTokenInfo] = useState<{
    name: string;
    symbol: string;
    decimals: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authenticated || !user?.wallet?.address || !tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
      setLoading(false);
      return;
    }

    fetchTokenData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, user?.wallet?.address, tokenAddress]);

  const fetchTokenData = async () => {
    if (!user?.wallet?.address) return;

    setLoading(true);
    setError('');

    try {
      const [tokenBalance, info] = await Promise.all([
        getTokenBalance(tokenAddress, user.wallet.address),
        getTokenInfo(tokenAddress),
      ]);

      setBalance(tokenBalance);
      setTokenInfo(info);
    } catch (err: any) {
      console.error('Error fetching token data:', err);
      setError('Failed to load token balance');
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated) {
    return null;
  }

  if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <svg
            className="animate-spin h-5 w-5 text-green-600"
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
          <span className="text-sm text-green-700">Loading token balance...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-red-800">{error}</p>
          <button
            onClick={fetchTokenData}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (balance === null || tokenInfo === null) {
    return null;
  }

  // Format balance with proper decimals
  const formattedBalance = (Number(balance) / Math.pow(10, tokenInfo.decimals)).toLocaleString(
    'en-US',
    { maximumFractionDigits: 2 }
  );

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          🪙 Your Token Balance
        </h3>
        <button
          onClick={fetchTokenData}
          className="text-xs text-green-600 hover:text-green-700 font-medium"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="bg-white rounded-lg p-5 border border-green-300">
        {balance > 0n ? (
          <>
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-4xl font-bold text-green-900">
                {formattedBalance}
              </span>
              <span className="text-lg text-green-700 font-medium">
                {tokenInfo.symbol}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Token Name:</span>
                <span className="font-medium text-gray-900">{tokenInfo.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Contract:</span>
                <span className="font-mono text-xs text-gray-700">
                  {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-green-700">
                ✅ You have successfully claimed your campaign tokens!
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-3">
            <p className="text-sm text-gray-600 mb-2">
              You do not have any {tokenInfo.symbol} tokens yet
            </p>
            <p className="text-xs text-gray-500">
              Claim your tokens if you contributed to this campaign
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
