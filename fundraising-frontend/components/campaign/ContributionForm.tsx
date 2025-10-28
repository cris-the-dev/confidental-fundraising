// components/campaign/ContributionForm.tsx
'use client';

import { useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useCampaigns } from '../../hooks/useCampaigns';
import { useDecrypt } from '../../hooks/useDecrypt';
import { useFhevm } from '../../contexts/FhevmContext';
import { parseEther } from 'viem';
import Link from 'next/link';
import { VAULT_ADDRESS } from '../../lib/contracts/config';

interface Props {
  campaignId: number;
  onSuccess: () => void;
}

export default function ContributeForm({ campaignId, onSuccess }: Props) {
  const { user, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const {
    contribute,
    loading,
    getEncryptedBalanceAndLocked,
  } = useCampaigns();
  const { decrypt } = useDecrypt();
  const { instance: fhevm, isInitialized, isLoading: fhevmLoading } = useFhevm();

  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Optional vault balance state (for display only, not required for contribution)
  const [availableBalance, setAvailableBalance] = useState<bigint | null>(null);
  const [checkingBalance, setCheckingBalance] = useState(false);

  // Instant balance check - OPTIONAL for display
  const handleCheckBalance = async () => {
    if (!authenticated || !wallets[0]?.address) {
      login();
      return;
    }

    setCheckingBalance(true);
    setError(null);

    try {
      // Get encrypted balance and locked amounts
      const { encryptedBalance, encryptedLocked } = await getEncryptedBalanceAndLocked();

      console.log('📦 Encrypted balance:', encryptedBalance);
      console.log('📦 Encrypted locked:', encryptedLocked);

      // Decrypt balance
      let balance = 0n;
      if (encryptedBalance && BigInt(encryptedBalance) !== 0n) {
        balance = await decrypt(encryptedBalance, VAULT_ADDRESS);
      }

      // Decrypt locked
      let locked = 0n;
      if (encryptedLocked && BigInt(encryptedLocked) !== 0n) {
        locked = await decrypt(encryptedLocked, VAULT_ADDRESS);
      }

      // Calculate available
      const available = balance - locked;
      setAvailableBalance(available);

      console.log('✅ Available balance:', available);
    } catch (err: any) {
      console.error('Balance check error:', err);
      setError('Failed to check vault balance. Please try again.');
    } finally {
      setCheckingBalance(false);
    }
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

      // Clear balance since contribution changed the locked amount
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
          {availableBalance !== null && (
            <button
              onClick={handleCheckBalance}
              disabled={checkingBalance}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
            >
              🔄 Refresh
            </button>
          )}
        </div>

        {availableBalance === null ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-sm text-gray-600">Balance Not Checked</span>
            </div>
            <button
              onClick={handleCheckBalance}
              disabled={checkingBalance || !authenticated}
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
            >
              {checkingBalance ? (
                <span className="flex items-center gap-2">
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
                  Checking...
                </span>
              ) : (
                '🔐 Check Vault Balance'
              )}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Optional: Check your balance to see available funds
            </p>
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
          {availableBalance !== null && (
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
          💡 Balance check is optional (instant decryption for display purposes only)
        </p>
      </div>
    </div>
  );
}