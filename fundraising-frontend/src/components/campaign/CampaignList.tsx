import { useState, useEffect } from 'react';
import { useCampaigns } from '../../hooks/useCampaigns';
import { CampaignCard } from './CampaignCard';

export function CampaignList() {
    const [campaignCount, setCampaignCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const { getCampaignCount } = useCampaigns();

    useEffect(() => {
        const loadCount = async () => {
            try {
                const count = await getCampaignCount();
                setCampaignCount(count);
            } catch (err) {
                console.error('Error loading campaign count:', err);
            } finally {
                setLoading(false);
            }
        };

        loadCount();
    }, []);

    if (loading) {
        return (
            <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <p className="mt-2 text-gray-600">Loading campaigns...</p>
            </div>
        );
    }

    if (campaignCount === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <div className="text-6xl mb-4">📢</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No campaigns yet
                </h3>
                <p className="text-gray-600">
                    Be the first to create a fundraising campaign!
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: campaignCount }, (_, i) => (
                <CampaignCard key={i} campaignId={i} />
            ))}
        </div>
    );
}