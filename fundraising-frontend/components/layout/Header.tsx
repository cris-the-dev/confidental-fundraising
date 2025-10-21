'use client';

import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';

export default function Header() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">🔒</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              Private Fundraising
            </span>
          </Link>

          <nav className="flex items-center space-x-6">
            <Link
              href="/"
              className="text-gray-700 hover:text-purple-600 font-medium transition"
            >
              Campaigns
            </Link>
            {authenticated && (
              <Link
                href="/create"
                className="text-gray-700 hover:text-purple-600 font-medium transition"
              >
                Create Campaign
              </Link>
            )}
            
            <div className="flex items-center space-x-4">
              {ready && !authenticated && (
                <button
                  onClick={login}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium"
                >
                  Connect Wallet
                </button>
              )}
              
              {authenticated && user && (
                <div className="flex items-center space-x-3">
                  <div className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-mono text-sm">
                    {user.wallet?.address && formatAddress(user.wallet.address)}
                  </div>
                  <button
                    onClick={logout}
                    className="text-gray-700 hover:text-red-600 font-medium transition"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}