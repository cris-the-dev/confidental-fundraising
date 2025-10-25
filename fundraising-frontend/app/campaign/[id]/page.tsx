'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { formatEther } from 'viem';
import { Campaign } from '../../../types';
import { useCampaigns } from '../../../hooks/useCampaigns';
import { ViewCampaignTotal } from '../../../components/campaign/ViewCampaignTotal';
import { ViewMyContribution } from '../../../components/campaign/ViewMyContribution';
import ContributeForm from '../../../components/campaign/ContributionForm';

export default function CampaignDetail() {
  const params = useParams();
  const router = useRouter();
  const { user, authenticated } = usePrivy();
  const { finalizeCampaign, cancelCampaign, claimTokens, getCampaign, loading } = useCampaigns();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const campaignId = parseInt(params.id as string);

  useEffect(() => {
    loadCampaign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const loadCampaign = async () => {
    try {
      setLoadingCampaign(true);
      setError(null);
      const data = await getCampaign(campaignId);
      setCampaign(data);
    } catch (err: any) {
      console.error('Error loading campaign:', err);
      setError(err.message || 'Failed to load campaign');
    } finally {
      setLoadingCampaign(false);
    }
  };

  const handleFinalize = async () => {
    try {
      setError(null);
      setActionSuccess(null);
      await finalizeCampaign(campaignId);
      setActionSuccess('Campaign finalized successfully!');
      await loadCampaign();

    } catch (err: any) {
      setError(err.message || 'Failed to finalize campaign');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this campaign?')) {
      return;
    }

    try {
      setError(null);
      setActionSuccess(null);
      await cancelCampaign(campaignId);
      setActionSuccess('Campaign cancelled successfully!');
      await loadCampaign();

    } catch (err: any) {
      setError(err.message || 'Failed to cancel campaign');
    }
  };

  const handleClaim = async () => {
    try {
      setError(null);
      setActionSuccess(null);
      await claimTokens(campaignId);
      setActionSuccess('Tokens claimed successfully!');

    } catch (err: any) {
      setError(err.message || 'Failed to claim tokens');
    }
  };

  if (loadingCampaign) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 font-medium">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!campaign) return null;

  const targetInEth = formatEther(campaign.targetAmount);
  const deadline = new Date(campaign.deadline * 1000);
  const now = new Date();
  const isExpired = deadline < now;
  const isOwner = authenticated && user?.wallet?.address?.toLowerCase() === campaign.owner.toLowerCase();
  const canContribute = !campaign.cancelled && !campaign.finalized && !isExpired;
  const canFinalize = isOwner && isExpired && !campaign.finalized && !campaign.cancelled;
  const canCancel = isOwner && !campaign.finalized && !campaign.cancelled;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <button
        onClick={() => router.push('/')}
        className="mb-6 text-purple-600 hover:text-purple-700 font-medium flex items-center"
      >
        ← Back to Campaigns
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-3xl font-bold text-gray-900">
                {campaign.title}
              </h1>
              {campaign.cancelled && (
                <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">
                  Cancelled
                </span>
              )}
              {campaign.finalized && !campaign.cancelled && (
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  Finalized
                </span>
              )}
              {!campaign.finalized && !campaign.cancelled && isExpired && (
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                  Ended
                </span>
              )}
              {!campaign.finalized && !campaign.cancelled && !isExpired && (
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  Active
                </span>
              )}
            </div>

            <div className="mb-6">
              <span className="text-sm text-gray-500">Campaign Owner</span>
              <p className="text-gray-700 font-mono">
                {campaign.owner.slice(0, 6)}...{campaign.owner.slice(-4)}
              </p>
            </div>

            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">
                {campaign.description}
              </p>
            </div>
          </div>

          {/* Campaign Stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Campaign Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-sm text-gray-500 block mb-1">
                  Target Amount
                </span>
                <span className="text-2xl font-bold text-purple-600">
                  {targetInEth} ETH
                </span>
              </div>

              <div>
                <span className="text-sm text-gray-500 block mb-1">
                  Deadline
                </span>
                <span className="text-lg font-medium text-gray-900">
                  {deadline.toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-purple-800">
                  🔒 <strong>Privacy Protected:</strong> Individual contribution
                  amounts are encrypted using FHEVM. Only contributors can see
                  their own contribution amounts.
                </p>
              </div>
            </div>
          </div>

          {/* Encrypted Data Section */}
          {authenticated && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                🔐 Encrypted Data
              </h2>
              <div className="space-y-4">
                <ViewCampaignTotal campaignId={campaignId} isOwner={isOwner} />
                <ViewMyContribution campaignId={campaignId} />
              </div>
            </div>
          )}

          {/* Owner Actions */}
          {isOwner && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Campaign Management
              </h2>

              {actionSuccess && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">{actionSuccess}</p>
                </div>
              )}

              <div className="space-y-3">
                {canFinalize && (
                  <button
                    onClick={handleFinalize}
                    disabled={loading}
                    className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
                  >
                    Finalize Campaign
                  </button>
                )}

                {canCancel && (
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
                  >
                    Cancel Campaign
                  </button>
                )}

                {!canFinalize && !canCancel && (
                  <p className="text-sm text-gray-600 text-center">
                    {campaign.finalized && 'Campaign has been finalized'}
                    {campaign.cancelled && 'Campaign has been cancelled'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {canContribute && (
            <ContributeForm
              campaignId={campaignId}
              onSuccess={loadCampaign}
            />
          )}

          {!canContribute && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Campaign Status
              </h3>
              <p className="text-gray-600 text-sm">
                {campaign.cancelled && 'This campaign has been cancelled.'}
                {campaign.finalized && !campaign.cancelled && 'This campaign has been finalized.'}
                {isExpired && !campaign.finalized && !campaign.cancelled && 'This campaign has ended.'}
              </p>

              {campaign.finalized && authenticated && (
                <button
                  onClick={handleClaim}
                  disabled={loading}
                  className="w-full mt-4 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50"
                >
                  Claim Tokens
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}