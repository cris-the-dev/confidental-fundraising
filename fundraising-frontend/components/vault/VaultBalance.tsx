'use client';

import { useState } from 'react';
import { formatEther } from 'viem';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useDecrypt } from '../../hooks/useDecrypt';
import { VAULT_ADDRESS } from '../../lib/contracts/config';
import { useCampaigns } from '../../hooks/useCampaigns';

export function VaultBalance() {
  const [balance, setBalance] = useState<bigint | null>(null);
  const [locked, setLocked] = useState<bigint | null>(null);
  const [error, setError] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);

  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { decrypt } = useDecrypt();

  const { getEncryptedBalanceAndLocked } = useCampaigns();

  const handleViewBalance = async () => {
    if (!authenticated || !wallets[0]?.address) {
      setError('Please connect your wallet');
      return;
    }

    setError('');
    setIsDecrypting(true);

    try {
      const wallet = wallets[0];

      const { encryptedBalance, encryptedLocked } = await getEncryptedBalanceAndLocked();

      // Decrypt balance
      let decryptedBalance = 0n;
      if (encryptedBalance && BigInt(encryptedBalance) !== 0n) {
        decryptedBalance = await decrypt(encryptedBalance, VAULT_ADDRESS);
      }

      // Decrypt locked
      let decryptedLocked = 0n;
      if (encryptedLocked && BigInt(encryptedLocked) !== 0n) {
        decryptedLocked = await decrypt(encryptedLocked, VAULT_ADDRESS);
      }

      setBalance(decryptedBalance);
      setLocked(decryptedLocked);
    } catch (err: any) {
      console.error('Decryption error:', err);
      setError(err.message || 'Failed to decrypt balance');
    } finally {
      setIsDecrypting(false);
    }
  };

  if (!authenticated) {
    return null;
  }

  const available = balance !== null && locked !== null ? balance - locked : null;

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          💎 Your Vault Balance
        </h3>

        {balance === null && (
          <button
            onClick={handleViewBalance}
            disabled={isDecrypting}
            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
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
              '🔐 View Balance'
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-800">❌ {error}</p>
        </div>
      )}

      {balance === null ? (
        <div className="bg-white rounded-lg p-4 border border-green-300">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">
              Encrypted
            </span>
          </div>
          <p className="text-xs text-gray-600">
            Your vault balance is encrypted on-chain. Click View Balance to decrypt instantly.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs font-medium text-green-700">
              ✅ Decrypted
            </span>
          </div>

          {/* Total Balance */}
          <div className="bg-white rounded-lg p-5 border border-green-300">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Total Balance</span>
              <span className="text-xs text-gray-500">🏦</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold text-gray-900">
                {formatEther(balance)}
              </span>
              <span className="text-sm text-gray-700 font-medium">ETH</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {balance.toString()} Wei
            </p>
          </div>

          {/* Locked Amount */}
          {locked !== null && locked > 0n && (
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-orange-800">Locked in Campaigns</span>
                <span className="text-xs">🔒</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-orange-900">
                  {formatEther(locked)}
                </span>
                <span className="text-sm text-orange-700 font-medium">ETH</span>
              </div>
              <p className="text-xs text-orange-600 mt-2">
                These funds are locked in active campaigns
              </p>
            </div>
          )}

          {/* Available to Withdraw */}
          {available !== null && (
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-5 border-2 border-green-400">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-green-800 font-medium">
                  Available to Withdraw
                </span>
                <span className="text-xs">💰</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold text-green-900">
                  {formatEther(available)}
                </span>
                <span className="text-sm text-green-700 font-medium">ETH</span>
              </div>
              <p className="text-xs text-green-700 mt-2">
                {available > 0n
                  ? 'Ready for withdrawal'
                  : 'All funds are locked in campaigns'}
              </p>
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800">
              🔒 Your balance is encrypted on-chain and decrypted instantly on your device
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
