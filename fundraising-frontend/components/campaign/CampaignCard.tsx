'use client';

import Link from 'next/link';
import { formatEther } from 'viem';
import { Campaign } from '../../types';

interface CampaignCardProps {
  campaign: Campaign;
}

export default function CampaignCard({ campaign }: CampaignCardProps) {
  const targetInEth = formatEther(campaign.targetAmount);
  const deadline = new Date(campaign.deadline * 1000);
  const now = new Date();
  const isExpired = deadline < now;
  const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const getStatusBadge = () => {
    if (campaign.cancelled) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
          Cancelled
        </span>
      );
    }
    if (campaign.finalized) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          Finalized
        </span>
      );
    }
    if (isExpired) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
          Ended
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
        Active
      </span>
    );
  };

  return (
    <Link href={`/campaign/${campaign.id}`}>
      <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-200 cursor-pointer">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-gray-900 line-clamp-2 flex-1">
              {campaign.title}
            </h3>
            {getStatusBadge()}
          </div>

          <p className="text-gray-600 mb-4 line-clamp-2">
            {campaign.description}
          </p>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Target</span>
              <span className="text-lg font-bold text-purple-600">
                {targetInEth} ETH
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                {isExpired ? 'Ended' : 'Time Left'}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {isExpired ? 'Campaign Ended' : `${daysLeft} days`}
              </span>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                Amounts encrypted with FHEVM 🔒
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
          <button className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition font-medium">
            View Campaign
          </button>
        </div>
      </div>
    </Link>
  );
}