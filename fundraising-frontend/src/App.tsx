import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { CreateCampaign } from './components/campaign/CreateCampaign';
import { CampaignList } from './components/campaign/CampaignList';
import { usePrivy } from '@privy-io/react-auth';
import { useFhevm } from './contexts/FhevmContext';

function App() {
    const { authenticated, ready } = usePrivy();
    const { isLoading: fhevmLoading, error: fhevmError } = useFhevm();

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex flex-col">
            <Header />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {fhevmLoading && (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                        <p className="mt-4 text-gray-600">Initializing FHEVM encryption...</p>
                    </div>
                )}

                {fhevmError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-800">
                            ❌ Error initializing FHEVM: {fhevmError.message}
                        </p>
                        <p className="text-red-600 text-sm mt-2">
                            Please refresh the page or check your configuration.
                        </p>
                    </div>
                )}

                {!fhevmLoading && !fhevmError && (
                    <>
                        {!ready || !authenticated ? (
                            <div className="text-center py-12">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                                    <span className="text-3xl">🔐</span>
                                </div>
                                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                                    Welcome to Confidential Fundraising
                                </h2>
                                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                    Create and contribute to fundraising campaigns with complete privacy.
                                    All contributions are encrypted using Fully Homomorphic Encryption.
                                </p>
                                <p className="text-sm text-purple-600 font-medium">
                                    Connect your wallet to get started
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                <section>
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                        Create Campaign
                                    </h2>
                                    <CreateCampaign />
                                </section>

                                <section>
                                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                        Active Campaigns
                                    </h2>
                                    <CampaignList />
                                </section>
                            </div>
                        )}
                    </>
                )}
            </main>

            <Footer />
        </div>
    );
}

export default App;