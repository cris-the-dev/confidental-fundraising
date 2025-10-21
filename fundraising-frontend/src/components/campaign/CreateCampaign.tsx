import { useState, FormEvent } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useCampaigns } from '../../hooks/useCampaigns';

export function CreateCampaign() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [duration, setDuration] = useState('30');
    const [isCreating, setIsCreating] = useState(false);
    const [txHash, setTxHash] = useState<string>('');
    const [error, setError] = useState<string>('');

    const { createCampaign } = useCampaigns();
    const { authenticated } = usePrivy();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!authenticated) {
            alert('Please connect your wallet');
            return;
        }

        setIsCreating(true);
        setError('');
        setTxHash('');

        try {
            const hash = await createCampaign(
                title,
                description,
                targetAmount,
                Number(duration)
            );

            setTxHash(hash);

            setTimeout(() => {
                setTitle('');
                setDescription('');
                setTargetAmount('');
                setDuration('30');
                setTxHash('');
            }, 3000);
        } catch (err) {
            console.error('Error creating campaign:', err);
            setError(err instanceof Error ? err.message : 'Failed to create campaign');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Create New Campaign
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Campaign Title
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="My Fundraising Campaign"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Describe your campaign..."
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Target Amount (ETH)
                        </label>
                        <input
                            type="number"
                            value={targetAmount}
                            onChange={(e) => setTargetAmount(e.target.value)}
                            step="0.01"
                            min="0.01"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="10.0"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Duration (days)
                        </label>
                        <input
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            min="1"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="30"
                            required
                        />
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-800 text-sm">{error}</p>
                    </div>
                )}

                {txHash && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-green-800 text-sm">
                            ✓ Campaign created! Transaction: {txHash.slice(0, 10)}...
                        </p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isCreating || !authenticated}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {isCreating ? 'Creating Campaign...' : 'Create Campaign'}
                </button>
            </form>
        </div>
    );
}