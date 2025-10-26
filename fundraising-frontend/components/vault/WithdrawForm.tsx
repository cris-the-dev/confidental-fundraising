// components/vault/WithdrawForm.tsx
'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useCampaigns } from '../../hooks/useCampaigns';

interface Props {
  availableBalance: bigint | null;
  onSuccess?: () => void;
}

export function WithdrawForm({ availableBalance, onSuccess }: Props) {
  const { withdrawFromVault, loading } = useCampaigns();
  const { authenticated, login } = usePrivy();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authenticated) {
      login();
      return;
    }

    if (availableBalance === null) {
      setError('Please decrypt your available balance first');
      return;
    }

    const amountNum = parseFloat(amount);

    if (!amount || amountNum <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    try {
      setError(null);
      setSuccess(false);

      await withdrawFromVault(amount);

      setSuccess(true);
      setAmount('');

      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (err: any) {
      console.error('Withdrawal error:', err);

      if (err.message?.includes('MustDecryptFirst')) {
        setError('Please decrypt your available balance first');
      } else if (err.message?.includes('DecryptionProcessing')) {
        setError('Balance decryption is still processing. Please wait...');
      } else if (err.message?.includes('DecryptionCacheExpired')) {
        setError('Your balance cache expired. Please refresh and try again.');
      } else if (err.message?.includes('Insufficient available balance')) {
        setError('Insufficient available balance for this withdrawal');
      } else {
        setError(err.message || 'Failed to withdraw. Please try again.');
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        💸 Withdraw from Vault
      </h3>

      <p className="text-sm text-gray-600 mb-6">
        Withdraw your available balance to your wallet. You must decrypt your balance first.
      </p>

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
            disabled={loading || availableBalance === null}
          />
          {availableBalance !== null && (
            <p className="text-xs text-gray-500 mt-1">
              Available: {(Number(availableBalance) / 1e18).toFixed(4)} ETH
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              ✅ Withdrawal successful! Check your wallet.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || availableBalance === null}
          className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
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
            'Connect Wallet to Withdraw'
          ) : availableBalance === null ? (
            'Decrypt Balance First'
          ) : (
            'Withdraw from Vault'
          )}
        </button>
      </form>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          ⚠️ You can only withdraw funds that are not locked in campaigns.
        </p>
      </div>
    </div>
  );
}