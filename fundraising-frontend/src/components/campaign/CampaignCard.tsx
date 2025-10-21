import { useState, useEffect } from 'react';
import { formatEther } from 'viem';
import { usePrivy } from '@privy-io/react-auth';
import { Campaign } from '../../types/campaign';
import { ContributeToCampaign } from './ContributeToCampaign';
import { ViewCampaignTotal } from './ViewCampaignTotal';
import { useCampaigns } from '../../hooks/useCampaigns';

interface Props {
    campaignId: number;
}

export function CampaignCard({ campaignId }: Props) {
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [showContribute, setShowContribute] = useState(false);
    const [loading, setLoading] = useState(true);

    const { getCampaign } = useCampaigns();
    const { user } = usePrivy();

    useEffect(() => {
        const loadCampaign = async () => {
            try {
                const data = await getCampaign(campaignId);
                setCampaign(data);
            } catch (err) {
                console.error('Error loading campaign:', err);
            } finally {
                setLoading(false);
            }
        };

        loadCampaign();
    }, [campaignId]);

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    if (!campaign) return null;

    const isOwner = user?.wallet?.address?.toLowerCase() === campaign.owner.toLowerCase();
    const now = BigInt(Math.floor(Date.now() / 1000));
    const isActive = !campaign.finalized && !campaign.cancelled && campaign.deadline > now;
    const timeLeft = campaign.deadline > now ? Number(campaign.deadline - now) : 0;
    const daysLeft = Math.floor(timeLeft / 86400);

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex-1">
                        {campaign.title}
                    </h3>
                    <div className="flex items-center space-x-2">
                        {isOwner && (
                            <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded">
                                Owner
                            </span>
                        )}
                    </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {campaign.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                    {campaign.cancelled && (
                        <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded">
                            ❌ Cancelled
                        </span>
                    )}
                    {campaign.finalized && !campaign.cancelled && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                            ✓ Finalized
                        </span>
                    )}
                    {isActive && (
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                            🟢 Active
                        </span>
                    )}
                    {!isActive && !campaign.finalized && !campaign.cancelled && (
                        <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2 py-1 rounded">
                            ⏰ Ended
                        </span>
                    )}
                </div>

                <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Target:</span>
                        <span className="font-medium text-gray-900">
                            {formatEther(campaign.targetAmount)} ETH
                        </span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Time Left:</span>
                        <span className="font-medium text-gray-900">
                            {isActive
                                ? daysLeft > 0
                                    ? `${daysLeft} days`
                                    : `${Math.floor(timeLeft / 3600)} hours`
                                : 'Ended'}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Creator:</span>
                        <span className="font-mono text-xs text-gray-700">
                            {campaign.owner.slice(0, 6)}...{campaign.owner.slice(-4)}
                        </span>
                    </div>
                </div>

                {isOwner && (
                    <div className="mb-4">
                        <ViewCampaignTotal campaignId={campaignId} />
                    </div>
                )}

                {isActive && !isOwner && (
                    <button
                        onClick={() => setShowContribute(!showContribute)}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                    >
                        {showContribute ? 'Hide' : '🔒 Contribute Privately'}
                    </button>
                )}
            </div>

            {showContribute && isActive && !isOwner && (
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <ContributeToCampaign
                        campaignId={campaignId}
                        onSuccess={() => setShowContribute(false)}
                    />
                </div>
            )}
        </div>
    );
}