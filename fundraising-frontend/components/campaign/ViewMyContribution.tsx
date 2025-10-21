'use client';

import { useState } from 'react';
import { formatEther } from 'viem';
import { usePrivy } from '@privy-io/react-auth';
import { useDecrypt } from '../../hooks/useDecrypt';
import { useCampaigns } from '../../hooks/useCampaigns';

interface Props {
  campaignId: number;
}

export function ViewMyContribution({ campaignId }: Props) {
  const [decryptedContribution, setDecryptedContribution] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  const { decrypt, isDecrypting } = useDecrypt();
  const { getMyContribution } = useCampaigns();
  const { authenticated } = usePrivy();

  const handleDecrypt = async () => {
    if (!authenticated) {
      alert('Please connect your wallet');
      return;
    }

    setError('');
    
    try {
      console.log('📊 Fetching your encrypted contribution...');
      const encryptedHandle = await getMyContribution(campaignId);
      
      if (!encryptedHandle || encryptedHandle === 0n) {
        setDecryptedContribution('0.0');
        return;
      }

      console.log('🔓 Decrypting your contribution...');
      const decrypted = await decrypt(encryptedHandle);
      
      const formattedAmount = formatEther(decrypted);
      setDecryptedContribution(formattedAmount);
      console.log('✅ Your contribution:', formattedAmount);
    } catch (err) {
      console.error('❌ Decryption error:', err);
      setError(err instanceof Error ? err.message : 'Failed to decrypt');
    }
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-blue-900">
          👤 Your Contribution
        </span>
        {decryptedContribution === null ? (
          <button
            onClick={handleDecrypt}
            disabled={isDecrypting || !authenticated}
            className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isDecrypting ? '🔓 Decrypting...' : '🔐 View My Amount'}
          </button>
        ) : (
          <button
            onClick={() => setDecryptedContribution(null)}
            className="text-xs bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 transition"
          >
            🔒 Hide
          </button>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-2 border border-red-200">
          ❌ {error}
        </div>
      )}

      {decryptedContribution !== null && (
        <div className="bg-white rounded p-3 border border-blue-300">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-blue-900">
              {decryptedContribution}
            </span>
            <span className="text-sm text-blue-700 font-medium">ETH</span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            {parseFloat(decryptedContribution) === 0 
              ? '💡 You haven\'t contributed yet' 
              : '✅ Only you can see this amount'}
          </p>
        </div>
      )}

      {decryptedContribution === null && (
        <p className="text-xs text-blue-700 mt-2">
          Click to decrypt your contribution. Your amount is private to you.
        </p>
      )}
    </div>
  );
}