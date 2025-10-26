'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatEther } from 'viem';
import { Campaign } from '../../types';

interface CampaignCardProps {
  campaign: Campaign;
}

const formatTimeLeft = (deadline: Date): string => {
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Ended';
  }

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    if (days >= 2) {
      return `${days} days`;
    } else if (remainingHours > 0) {
      return `${days}d ${remainingHours}h`;
    } else {
      return `${days} day`;
    }
  } else if (hours > 0) {
    const remainingMinutes = minutes % 60;
    if (remainingMinutes > 0) {
      return `${hours}h ${remainingMinutes}m`;
    } else {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
  } else if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  } else {
    return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  }
};

export default function CampaignCard({ campaign }: CampaignCardProps) {
  const targetInEth = formatEther(campaign.targetAmount);
  const deadline = new Date(campaign.deadline * 1000);
  const [timeLeft, setTimeLeft] = useState<string>(formatTimeLeft(deadline));
  const [isExpired, setIsExpired] = useState<boolean>(deadline < new Date());

  // Update time left periodically
  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date();
      const expired = deadline < now;
      setIsExpired(expired);
      setTimeLeft(formatTimeLeft(deadline));
    };

    // Update immediately
    updateTimeLeft();

    // Determine update interval based on time left
    const diffMs = deadline.getTime() - new Date().getTime();
    let interval: NodeJS.Timeout;

    if (diffMs <= 0) {
      // Already expired, no need to update
      return;
    } else if (diffMs < 60 * 1000) {
      // Less than 1 minute: update every second
      interval = setInterval(updateTimeLeft, 1000);
    } else if (diffMs < 60 * 60 * 1000) {
      // Less than 1 hour: update every 10 seconds
      interval = setInterval(updateTimeLeft, 10000);
    } else if (diffMs < 24 * 60 * 60 * 1000) {
      // Less than 1 day: update every minute
      interval = setInterval(updateTimeLeft, 60000);
    } else {
      // More than 1 day: update every 10 minutes
      interval = setInterval(updateTimeLeft, 600000);
    }

    return () => clearInterval(interval);
  }, [deadline]);

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
              <div className="flex items-center gap-1">
                {!isExpired && (timeLeft.includes('minute') || timeLeft.includes('second')) && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
                <span className={`text-sm font-medium ${
                  isExpired
                    ? 'text-gray-500'
                    : timeLeft.includes('minute') || timeLeft.includes('second')
                    ? 'text-red-600 font-bold animate-pulse'
                    : timeLeft.includes('hour') || timeLeft === '1 day' || timeLeft.includes('1d')
                    ? 'text-orange-600 font-semibold'
                    : 'text-gray-900'
                }`}>
                  {isExpired ? 'Campaign Ended' : timeLeft}
                </span>
              </div>
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