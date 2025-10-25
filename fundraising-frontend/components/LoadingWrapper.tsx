'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useFhevm } from '../contexts/FhevmContext';

export default function LoadingWrapper({ children }: { children: React.ReactNode }) {
    const { ready: privyReady } = usePrivy();
    const { isLoading: fhevmLoading, error: fhevmError } = useFhevm();

    if (!privyReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Loading Application...
                    </h2>
                    <p className="text-gray-600">
                        Initializing wallet connection
                    </p>
                </div>
            </div>
        );
    }

    if (fhevmLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-md">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Initializing Encryption System...
                    </h2>
                    <p className="text-gray-600 mb-4">
                        Loading FHEVM from Zama network
                    </p>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <p className="text-xs text-purple-800">
                            🔒 Setting up fully homomorphic encryption for private contributions
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (fhevmError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-md">
                    <div className="text-red-600 text-6xl mb-4">⚠️</div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Initialization Failed
                    </h2>
                    <p className="text-gray-600 mb-4">
                        Failed to initialize encryption system
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-red-800 font-mono">
                            {fhevmError.message}
                        </p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition font-medium"
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}