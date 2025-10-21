'use client';

import { useEffect, useState } from 'react';
import CampaignCard from './CampaignCard';
import { useCampaigns } from '../../hooks/useCampaigns';
import { Campaign } from '../../types';

export default function CampaignList() {
  const { getCampaignCount, getCampaign } = useCampaigns();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          Be the first to create a private fundraising campaign!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {campaigns.map((campaign) => (
        <CampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </div>
  );
}