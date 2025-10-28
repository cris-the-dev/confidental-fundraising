'use client';

import { useState } from 'react';
import { formatEther } from 'viem';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useCampaigns } from '../../hooks/useCampaigns';
import { useDecrypt } from '../../hooks/useDecrypt';
import { CONTRACT_ADDRESS } from '../../lib/contracts/config';

interface Props {
  campaignId: number;
  isOwner: boolean;
}

export function ViewCampaignTotal({ campaignId, isOwner }: Props) {
  const [totalRaised, setTotalRaised] = useState<bigint | null>(null);
  const [error, setError] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);

  const { loading, getEncryptedTotalRaised } = useCampaigns();
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { decrypt } = useDecrypt();

  const handleViewTotal = async () => {
    if (!authenticated || !wallets[0]?.address) {
      setError('Please connect your wallet');
      return;
    }

    if (!isOwner) {
      setError('Only the campaign owner can view the total raised.');
      return;
    }

    setError('');
    setIsDecrypting(true);

    try {
      // Get encrypted total raised from hook
      const encryptedTotal = await getEncryptedTotalRaised(campaignId);

      // Check if total exists
      if (!encryptedTotal || BigInt(encryptedTotal) === 0n) {
        setTotalRaised(0n);
        setIsDecrypting(false);
        return;
      }

      // Decrypt using useDecrypt hook
      const decryptedValue = await decrypt(encryptedTotal, CONTRACT_ADDRESS);

      setTotalRaised(decryptedValue);
    } catch (err: any) {
      console.error('Decryption error:', err);
      setError(err.message || 'Failed to decrypt total raised');
    } finally {
      setIsDecrypting(false);
    }
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

        {totalRaised === null && (
          <button
            onClick={handleViewTotal}
            disabled={isDecrypting || loading || !authenticated}
            className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
          >
            {isDecrypting ? (
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
                Decrypting...
              </span>
            ) : (
              '🔐 View Total Raised'
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-800">❌ {error}</p>
        </div>
      )}

      {totalRaised === null ? (
        <div className="bg-white rounded-lg p-3 border border-purple-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">
              Encrypted
            </span>
          </div>
          <p className="text-xs text-gray-600">
            Campaign total is encrypted on-chain. Click the button above to decrypt instantly.
          </p>
        </div>
      ) : (
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

                <p className="text-xs text-purple-600">
                  🔒 Only you (campaign owner) can see this amount
                </p>
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
