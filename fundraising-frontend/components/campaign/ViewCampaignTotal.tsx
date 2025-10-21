'use client';

import { useState } from 'react';
import { formatEther } from 'viem';
import { usePrivy } from '@privy-io/react-auth';
import { useDecrypt } from '../../hooks/useDecrypt';
import { useCampaigns } from '../../hooks/useCampaigns';
import { useFhevm } from '../../contexts/FhevmContext';

interface Props {
  campaignId: number;
}

export function ViewCampaignTotal({ campaignId }: Props) {
  const [decryptedTotal, setDecryptedTotal] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { decrypt, isDecrypting } = useDecrypt();
  const { getEncryptedTotal } = useCampaigns();
  const { isInitialized, isLoading: fhevmLoading } = useFhevm();
  const { authenticated } = usePrivy();

  const handleDecrypt = async () => {
    if (!authenticated) {
      alert('Please connect your wallet');
      return;
    }

    if (!isInitialized) {
      setError('FHEVM is still initializing. Please wait a moment and try again.');
      return;
    }

    setError('');

    try {
      console.log('📊 Fetching encrypted total...');
      const encryptedHandle = await getEncryptedTotal(campaignId);

      if (!encryptedHandle || encryptedHandle === 0n) {
        setDecryptedTotal('0.0');
        return;
      }

      console.log('🔓 Decrypting total...');
      const decrypted = await decrypt(encryptedHandle);

      const formattedTotal = formatEther(decrypted);
      setDecryptedTotal(formattedTotal);
      console.log('✅ Decrypted total:', formattedTotal);
    } catch (err) {
      console.error('❌ Decryption error:', err);
      setError(err instanceof Error ? err.message : 'Failed to decrypt');
    }
  };

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-purple-900">
          💰 Campaign Total Raised
        </span>
        {decryptedTotal === null ? (
          <button
            onClick={handleDecrypt}
            disabled={isDecrypting || !authenticated || fhevmLoading || !isInitialized}
            className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isDecrypting ? '🔓 Decrypting...' : fhevmLoading ? '⏳ Initializing...' : '🔐 View Total'}
          </button>
        ) : (
          <button
            onClick={() => setDecryptedTotal(null)}
            className="text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition"
          >
            🔒 Hide
          </button>
        )}
      </div>

      {/* FHEVM Loading State */}
      {fhevmLoading && (
        <div className="text-xs text-purple-700 bg-purple-100 p-2 rounded mb-2">
          ⏳ Initializing encryption system...
        </div>
      )}

      {error && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-2 border border-red-200">
          ❌ {error}
        </div>
      )}

      {decryptedTotal !== null && (
        <div className="bg-white rounded p-3 border border-purple-300">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-purple-900">
              {decryptedTotal}
            </span>
            <span className="text-sm text-purple-700 font-medium">ETH</span>
          </div>
          <p className="text-xs text-purple-600 mt-1">
            ✅ Decrypted using your private key (only you can see this)
          </p>
        </div>
      )}

      {decryptedTotal === null && !fhevmLoading && (
        <p className="text-xs text-purple-700 mt-2">
          Click to decrypt the encrypted total. You will sign a message to prove ownership.
        </p>
      )}
    </div>
  );
}