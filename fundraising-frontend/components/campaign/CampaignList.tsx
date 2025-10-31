'use client';

import { useEffect, useState, useMemo } from 'react';
import CampaignCard from './CampaignCard';
import { useCampaigns } from '../../hooks/useCampaigns';
import { Campaign } from '../../types';

type CampaignStatus = 'all' | 'active' | 'ended' | 'finalized' | 'cancelled';

export default function CampaignList() {
  const { getCampaignCount, getCampaign } = useCampaigns();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<CampaignStatus>('all');

  useEffect(() => {
    loadCampaigns();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);

      const count = await getCampaignCount();

      if (count === 0) {
        setCampaigns([]);
        return;
      }

      const campaignPromises = [];
      for (let i = 0; i < count; i++) {
        campaignPromises.push(getCampaign(i));
      }

      const loadedCampaigns = await Promise.all(campaignPromises);
      setCampaigns(loadedCampaigns.reverse()); // Show newest first

    } catch (err: any) {
      console.error('Error loading campaigns:', err);
      setError(err.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine campaign status
  const getCampaignStatus = (campaign: Campaign): CampaignStatus => {
    if (campaign.cancelled) return 'cancelled';
    if (campaign.finalized) return 'finalized';
    const isExpired = campaign.deadline * 1000 < Date.now();
    if (isExpired) return 'ended';
    return 'active';
  };

  // Filter campaigns based on selected tab
  const filteredCampaigns = useMemo(() => {
    if (selectedTab === 'all') return campaigns;
    return campaigns.filter(campaign => getCampaignStatus(campaign) === selectedTab);
  }, [campaigns, selectedTab]);

  // Count campaigns by status
  const campaignCounts = useMemo(() => {
    const counts = {
      all: campaigns.length,
      active: 0,
      ended: 0,
      finalized: 0,
      cancelled: 0,
    };
    campaigns.forEach(campaign => {
      const status = getCampaignStatus(campaign);
      counts[status]++;
    });
    return counts;
  }, [campaigns]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-medium">Error: {error}</p>
        <button
          onClick={loadCampaigns}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🎯</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          No Campaigns Yet
        </h3>
        <p className="text-gray-600 mb-6">
          Be the first to create a confidential fundraising campaign!
        </p>
      </div>
    );
  }

  const tabs: { key: CampaignStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'ended', label: 'Ended' },
    { key: 'finalized', label: 'Finalized' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex flex-wrap gap-2 sm:gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key)}
              className={`
                px-4 py-2 text-sm font-medium transition-colors relative
                ${selectedTab === tab.key
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent'
                }
              `}
            >
              {tab.label}
              <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {campaignCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Grid */}
      {filteredCampaigns.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            No {selectedTab === 'all' ? '' : selectedTab.charAt(0).toUpperCase() + selectedTab.slice(1)} Campaigns
          </h3>
          <p className="text-gray-600 mb-6">
            There are no campaigns with this status.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}