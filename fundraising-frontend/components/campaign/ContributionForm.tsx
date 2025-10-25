'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useCampaigns } from '../../hooks/useCampaigns';
import { useFhevm } from '../../contexts/FhevmContext';

interface ContributeFormProps {
    campaignId: number;
    onSuccess?: () => void;
}

export default function ContributeForm({ campaignId, onSuccess }: ContributeFormProps) {
    const { contribute, loading } = useCampaigns();
    const { isInitialized, isLoading: fhevmLoading } = useFhevm();
    const { authenticated, login } = usePrivy();
    const [amount, setAmount] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [executing, setExecuting] = useState(loading);

    useEffect(() => {
        setExecuting(loading);
    }, [loading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!authenticated) {
            login();
            return;
        }

        if (!isInitialized) {
            setError('FHEVM is still initializing. Please wait a moment and try again.');
            return;
        }

        const amountNum = parseFloat(amount);
        
        if (!amount || amountNum <= 0) {
            setError('Please enter a valid amount greater than 0');
            return;
        }

        if (amountNum > 18.4) {
            setError('Amount too large. Maximum is ~18.4 ETH (uint64 limit)');
            return;
        }

        try {
            setExecuting(true);
            setError(null);
            setSuccess(false);

            await contribute(campaignId, amount);

            setSuccess(true);
            setAmount('');

            if (onSuccess) {
                setTimeout(onSuccess, 2000);
            }
        } catch (err: any) {
            console.error('Contribution error:', err);
            setError(err.message || 'Failed to contribute. Please try again.');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
                🔒 Make a Private Contribution
            </h3>

            <p className="text-sm text-gray-600 mb-6">
                Your contribution amount will be encrypted using FHEVM technology.
                Only you can see how much you contributed.
            </p>

            {/* FHEVM Loading State */}
            {fhevmLoading && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <svg className="animate-spin h-5 w-5 text-blue-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-sm text-blue-800">
                            Initializing FHEVM encryption system...
                        </p>
                    </div>
                </div>
            )}

            {/* FHEVM Ready State */}
            {!fhevmLoading && isInitialized && (
                <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs text-green-800 flex items-center">
                        ✅ Encryption system ready
                    </p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount (ETH)
                    </label>
                    <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        max="18"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.1"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        disabled={executing || fhevmLoading || !isInitialized}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Supports decimals (e.g., 0.1 ETH). Max ~18.4 ETH (uint64 limit)
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-sm text-green-800">
                            ✅ Contribution successful! Your amount is now encrypted on-chain.
                        </p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={executing || fhevmLoading || !isInitialized}
                    className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {executing ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                        </span>
                    ) : fhevmLoading ? (
                        'Initializing Encryption...'
                    ) : !isInitialized ? (
                        'Waiting for FHEVM...'
                    ) : authenticated ? (
                        'Contribute Now'
                    ) : (
                        'Connect Wallet to Contribute'
                    )}
                </button>
            </form>

            <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                    🔐 Privacy guaranteed: Your contribution amount is encrypted end-to-end
                    using fully homomorphic encryption (FHE). Values are stored as Wei (1 ETH = 10^18 Wei).
                </p>
            </div>
        </div>
    );
}