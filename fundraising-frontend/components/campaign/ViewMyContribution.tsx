'use client';

import { useState } from 'react';
import { formatEther } from 'viem';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useCampaigns } from '../../hooks/useCampaigns';
import { useDecrypt } from '../../hooks/useDecrypt';
import { CONTRACT_ADDRESS } from '../../lib/contracts/config';

interface Props {
  campaignId: number;
  externalProcessing?: boolean;
}

export function ViewMyContribution({ campaignId, externalProcessing = false }: Props) {
  const [contribution, setContribution] = useState<bigint | null>(null);
  const [hasContrib, setHasContrib] = useState(false);
  const [error, setError] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);

  const { checkHasContribution, getEncryptedContribution } = useCampaigns();
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { decrypt } = useDecrypt();

  const handleViewContribution = async () => {
    if (!authenticated || !wallets[0]?.address) {
      setError('Please connect your wallet');
      return;
    }

    setError('');
    setIsDecrypting(true);

    try {
      const wallet = wallets[0];

      // Check if user has contributed
      const hasContribution = await checkHasContribution(campaignId, wallet.address);
      setHasContrib(hasContribution);

      if (!hasContribution) {
        setError("You haven't contributed to this campaign yet.");
        setIsDecrypting(false);
        return;
      }

      // Get encrypted contribution from hook
      const encryptedContribution = await getEncryptedContribution(campaignId, wallet.address);

      console.log('📦 Encrypted contribution:', encryptedContribution);

      // Check if contribution exists (handle is not 0)
      if (!encryptedContribution || BigInt(encryptedContribution) === 0n) {
        setError("No contribution found.");
        setIsDecrypting(false);
        return;
      }

      // Decrypt using useDecrypt hook
      const decryptedValue = await decrypt(encryptedContribution, CONTRACT_ADDRESS);

      console.log('✅ Decrypted contribution:', decryptedValue);

      setContribution(decryptedValue);
    } catch (err: any) {
      console.error('Decryption error:', err);
      setError(err.message || 'Failed to decrypt contribution');
    } finally {
      setIsDecrypting(false);
    }
  };

  // Show external processing message
  if (externalProcessing) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-blue-900">
            👤 Your Contribution
          </span>
        </div>
        <div className="bg-white rounded-lg p-4 border border-blue-300">
          <div className="flex items-center gap-3">
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
            <div>
              <p className="text-sm font-medium text-blue-900">Processing claim...</p>
              <p className="text-xs text-blue-700">Decryption in progress</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-blue-900">
          👤 Your Contribution
        </span>

        {contribution === null && (
          <button
            onClick={handleViewContribution}
            disabled={isDecrypting}
            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
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
              '🔐 View Contribution'
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-800">❌ {error}</p>
        </div>
      )}

      {contribution === null ? (
        <div className="bg-white rounded-lg p-3 border border-blue-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">
              Encrypted
            </span>
          </div>
          <p className="text-xs text-gray-600">
            Your contribution is encrypted. Click View Contribution to decrypt instantly.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-4 border border-blue-300">
          <div className="flex items-center gap-2 mb-2">
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

              <p className="text-xs text-gray-500">
                {contribution.toString()} Wei
              </p>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-blue-600">
                  🔒 Your contribution amount (decrypted instantly on your device)
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-600">
              💡 You have not contributed to this campaign yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}
