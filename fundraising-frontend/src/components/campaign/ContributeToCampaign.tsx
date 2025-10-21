import { useState, FormEvent } from 'react';
import { parseEther } from 'viem';
import { useEncrypt } from '../../hooks/useEncrypt';
import { usePrivy } from '@privy-io/react-auth';
import { useCampaigns } from '../../hooks/useCampaigns';

interface Props {
    campaignId: number;
    onSuccess?: () => void;
}

export function ContributeToCampaign({ campaignId, onSuccess }: Props) {
    const [amount, setAmount] = useState('');
    const [txHash, setTxHash] = useState('');

    const { encrypt64, isEncrypting, error: encryptError } = useEncrypt();
    const { contribute } = useCampaigns();
    const { authenticated } = usePrivy();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!authenticated) {
            alert('Please connect your wallet');
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        setIsSubmitting(true);
        setError('');
        setTxHash('');

        try {
            const amountWei = parseEther(amount);
            console.log('🔐 Encrypting amount:', amountWei.toString());

            const encrypted = await encrypt64(amountWei);
            console.log('✅ Encrypted successfully');

            console.log('📝 Submitting transaction...');
            const hash = await contribute(campaignId, encrypted.data, encrypted.proof);

            setTxHash(hash);
            console.log('✅ Transaction submitted:', hash);

            setTimeout(() => {
                setAmount('');
                setTxHash('');
                if (onSuccess) onSuccess();
            }, 3000);
        } catch (err) {
            console.error('❌ Error:', err);
            setError(err instanceof Error ? err.message : 'Failed to contribute');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isProcessing = isEncrypting || isSubmitting;
    const displayError = error || encryptError;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contribution Amount (ETH)
                </label>
                <div className="relative">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        step="0.01"
                        min="0.01"
                        placeholder="0.1"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        disabled={isProcessing}
                        required
                    />
                    <div className="absolute right-3 top-2.5 text-gray-500 text-sm">
                        ETH
                    </div>
                </div>
                <p className="mt-1 text-xs text-purple-600 bg-purple-50 p-2 rounded">
                    🔒 Your contribution amount will be encrypted using FHEVM before submission
                </p>
            </div>

            {displayError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-800 text-sm">{displayError}</p>
                </div>
            )}

            {txHash && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-green-800 text-sm">
                        ✓ Contribution successful! Your amount is now encrypted on-chain.
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                        TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    </p>
                </div>
            )}

            <button
                type="submit"
                disabled={isProcessing || !authenticated}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all"
            >
                {isEncrypting && '🔐 Encrypting...'}
                {isSubmitting && !isEncrypting && '📝 Submitting...'}
                {!isProcessing && '💝 Contribute Privately'}
            </button>
        </form>
    );
}