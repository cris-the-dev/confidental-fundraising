'use client';

import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import CampaignList from '../components/campaign/CampaignList';

export default function Home() {
  const { authenticated } = usePrivy();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Confidential Fundraising
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Create and support fundraising campaigns with complete privacy. 
          Powered by FHEVM, your contribution amounts remain encrypted on-chain.
        </p>
        
        {authenticated && (
          <Link href="/create">
            <button className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition font-medium text-lg">
              Create Campaign
            </button>
          </Link>
        )}
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-4xl mb-3">🔒</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Fully Private
          </h3>
          <p className="text-gray-600 text-sm">
            Your contribution amounts are encrypted using FHEVM technology. 
            Only you know how much you contributed.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-4xl mb-3">⚡</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            On-Chain Security
          </h3>
          <p className="text-gray-600 text-sm">
            All operations happen on-chain with full cryptographic guarantees. 
            No trusted third parties required.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-4xl mb-3">🎯</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Transparent Goals
          </h3>
          <p className="text-gray-600 text-sm">
            Campaign goals and deadlines are public, while individual 
            contributions remain private.
          </p>
        </div>
      </div>

      {/* Campaigns Section */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">
            Active Campaigns
          </h2>
        </div>
        
        <CampaignList />
      </div>
    </div>
  );
}