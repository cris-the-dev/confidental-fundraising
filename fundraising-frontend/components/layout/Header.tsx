'use client';

import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function Header() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
              <Image
                src="/logo.png"
                alt="Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <span className="text-lg sm:text-xl font-bold text-gray-900 hidden sm:inline">
              Confidential Fundraising
            </span>
            <span className="text-lg font-bold text-gray-900 sm:hidden">
              {/* CF */}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-6">
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

            {authenticated && (
              <Link
                href="/vault"
                className="text-gray-700 hover:text-purple-600 font-medium transition"
              >
                My Vault
              </Link>
            )}

            <div className="flex items-center space-x-4">
              {!ready && (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin h-5 w-5 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                  <span className="text-sm text-gray-600">Loading...</span>
                </div>
              )}

              {ready && !authenticated && (
                <button
                  onClick={login}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium"
                >
                  Connect Wallet
                </button>
              )}

              {ready && authenticated && user && (
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

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center space-x-3">
            {/* Mobile wallet status */}
            {ready && authenticated && user && (
              <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded-lg font-mono text-xs">
                {user.wallet?.address && formatAddress(user.wallet.address)}
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-4 space-y-3">
            <Link
              href="/"
              onClick={closeMobileMenu}
              className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-lg font-medium transition"
            >
              Campaigns
            </Link>

            {authenticated && (
              <>
                <Link
                  href="/create"
                  onClick={closeMobileMenu}
                  className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-lg font-medium transition"
                >
                  Create Campaign
                </Link>
                <Link
                  href="/vault"
                  onClick={closeMobileMenu}
                  className="block px-4 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-lg font-medium transition"
                >
                  My Vault
                </Link>
              </>
            )}

            <div className="pt-3 border-t border-gray-200">
              {!ready && (
                <div className="flex items-center justify-center space-x-2 py-2">
                  <div className="animate-spin h-5 w-5 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                  <span className="text-sm text-gray-600">Loading...</span>
                </div>
              )}

              {ready && !authenticated && (
                <button
                  onClick={() => {
                    login();
                    closeMobileMenu();
                  }}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium"
                >
                  Connect Wallet
                </button>
              )}

              {ready && authenticated && (
                <button
                  onClick={() => {
                    logout();
                    closeMobileMenu();
                  }}
                  className="w-full bg-red-50 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition font-medium"
                >
                  Disconnect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}