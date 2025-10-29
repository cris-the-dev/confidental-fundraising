'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { VaultBalance } from '../../components/vault/VaultBalance';
import { DepositForm } from '../../components/vault/DepositForm';
import { WithdrawForm } from '../../components/vault/WithdrawForm';

export default function VaultPage() {
  const { authenticated, login } = usePrivy();
  const [availableBalance, setAvailableBalance] = useState<bigint | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    // Trigger refresh
    setRefreshKey(prev => prev + 1);
  };

  if (!authenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 lg:p-12 text-center">
          <div className="mb-4 sm:mb-6">
            <span className="text-5xl sm:text-6xl">🔐</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
            Your Private Vault
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
            Connect your wallet to access your encrypted vault
          </p>
          <button
            onClick={login}
            className="bg-blue-600 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg hover:bg-blue-700 transition font-medium text-sm sm:text-base"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          🏦 My Vault
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Manage your encrypted funds. Deposit, view balance, and withdraw securely.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Balance Display */}
        <div className="lg:col-span-2">
          <VaultBalance key={`balance-${refreshKey}`} />

          <div className="mt-6 sm:mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-blue-900 mb-3">
              ℹ️ How It Works
            </h3>
            <div className="space-y-3 text-sm text-blue-800">
              <div className="flex gap-3">
                <span className="flex-shrink-0">1️⃣</span>
                <p><strong>Deposit:</strong> Add ETH to your encrypted vault</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0">2️⃣</span>
                <p><strong>Contribute:</strong> Use vault funds for campaign contributions (funds get locked)</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0">3️⃣</span>
                <p><strong>Withdraw:</strong> Withdraw available (unlocked) balance anytime</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0">🔒</span>
                <p><strong>Privacy:</strong> All balances are encrypted - only you can decrypt and see your amounts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-6">
          <DepositForm onSuccess={handleSuccess} />
          <WithdrawForm 
            availableBalance={availableBalance} 
            onSuccess={handleSuccess} 
          />
        </div>
      </div>
    </div>
  );
}