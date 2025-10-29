// app/campaigns/[id]/page.tsx - Update the owner actions section

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { formatEther } from 'viem';
import { Campaign, DecryptStatus } from '../../../types';
import { useCampaigns } from '../../../hooks/useCampaigns';
import { ViewCampaignTotal } from '../../../components/campaign/ViewCampaignTotal';
import { ViewMyContribution } from '../../../components/campaign/ViewMyContribution';
import ContributeForm from '../../../components/campaign/ContributionForm';
import { FinalizeCampaignModal } from '../../../components/campaign/FinalizeCampaignModal';
import { CampaignTokenBalance } from '../../../components/campaign/CampaignTokenBalance';

export default function CampaignDetail() {
  const params = useParams();
  const router = useRouter();
  const { user, authenticated } = usePrivy();
  const {
    cancelCampaign,
    claimTokens,
    getCampaign,
    getContributionStatus,
    requestMyContributionDecryption,
    checkHasClaimed,
    loading
  } = useCampaigns();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [isClaimingProcess, setIsClaimingProcess] = useState(false);
  const [claimingStep, setClaimingStep] = useState<string>('');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [tokenBalanceKey, setTokenBalanceKey] = useState(0); // Key to force re-render token balance
  const [contributionKey, setContributionKey] = useState(0); // Key to force re-render contribution
  const [hasClaimed, setHasClaimed] = useState(false);
  const [checkingClaimStatus, setCheckingClaimStatus] = useState(false);

  const campaignId = parseInt(params.id as string);

  useEffect(() => {
    loadCampaign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  useEffect(() => {
    if (campaign && authenticated && user?.wallet?.address) {
      checkClaimStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign, authenticated, user?.wallet?.address]);

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

  const checkClaimStatus = async () => {
    if (!authenticated || !user?.wallet?.address) {
      return;
    }

    setCheckingClaimStatus(true);
    try {
      const claimed = await checkHasClaimed(campaignId, user.wallet.address);
      setHasClaimed(claimed);
    } catch (err) {
      console.error('Error checking claim status:', err);
    } finally {
      setCheckingClaimStatus(false);
    }
  };

  const handleFinalize = () => {
    setShowFinalizeModal(true);
  };

  const handleFinalizeSuccess = () => {
    setActionSuccess('Campaign finalized successfully!');
    loadCampaign();
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this campaign? All locked funds will be returned to contributors.')) {
      return;
    }

    try {
      setError(null);
      setActionSuccess(null);
      await cancelCampaign(campaignId);
      setActionSuccess('Campaign cancelled successfully! All funds have been unlocked.');
      await loadCampaign();

    } catch (err: any) {
      setError(err.message || 'Failed to cancel campaign');
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const handleClaim = async () => {
    if (!authenticated || !user?.wallet?.address) {
      setError('Please connect your wallet');
      return;
    }

    setError(null);
    setActionSuccess(null);
    setIsClaimingProcess(true);

    try {
      // Step 1: Check contribution status
      setClaimingStep('Checking your contribution status...');
      const status = await getContributionStatus(campaignId, user.wallet.address);

      const currentTimeMillis = Date.now();
      const statusCacheExp = status.cacheExpiry;

      // Step 2: If not decrypted, request decryption
      if (status.status === DecryptStatus.NONE || (status.status === DecryptStatus.DECRYPTED && (status.contribution === 0n || statusCacheExp <= BigInt(currentTimeMillis)))) {
        setClaimingStep('Your contribution needs to be decrypted first...');
        await requestMyContributionDecryption(campaignId);

        // Wait and poll for decryption to complete
        setClaimingStep('Waiting for decryption (10-30 seconds)...');

        const decryptedData = await waitForDecryption(campaignId, user.wallet.address);

        if (!decryptedData || decryptedData.contribution === 0n) {
          throw new Error('Unable to decrypt contribution or contribution is 0');
        }
      } else if (status.status === DecryptStatus.PROCESSING) {
        setClaimingStep('Decryption already in progress, waiting...');

        const decryptedData = await waitForDecryption(campaignId, user.wallet.address);

        if (!decryptedData || decryptedData.contribution === 0n) {
          throw new Error('Unable to decrypt contribution or contribution is 0');
        }
      }

      // Step 3: Claim tokens
      setClaimingStep('Claiming your tokens...');
      await claimTokens(campaignId);

      setActionSuccess('Tokens claimed successfully!');
      setClaimingStep('');

      // Refresh token balance and contribution display after claiming
      setTokenBalanceKey(prev => prev + 1);
      setContributionKey(prev => prev + 1);

      // Update claim status
      setHasClaimed(true);
    } catch (err: any) {
      console.error('Claim error:', err);

      let errorMessage = err.message || 'Failed to claim tokens';

      if (err.message?.includes('ContributionNotDecrypted')) {
        errorMessage = 'Your contribution needs to be decrypted first. Please try again.';
      } else if (err.message?.includes('AlreadyClaimed')) {
        errorMessage = 'You have already claimed your tokens.';
      } else if (err.message?.includes('NoTokensToClaim')) {
        errorMessage = 'No tokens available to claim (campaign may have failed).';
      }

      setError(errorMessage);
      setClaimingStep('');
    } finally {
      setIsClaimingProcess(false);
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  };

  const waitForDecryption = async (
    campaignId: number,
    userAddress: string
  ): Promise<{ contribution: bigint } | null> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 24; // 24 * 5 seconds = 2 minutes max

      const interval = setInterval(async () => {
        attempts++;

        try {
          const status = await getContributionStatus(campaignId, userAddress);

          if (status.status === DecryptStatus.DECRYPTED && status.contribution > 0n) {
            clearInterval(interval);
            setPollingInterval(null);
            resolve({ contribution: status.contribution });
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            setPollingInterval(null);
            reject(new Error('Decryption timeout - please try again'));
          }
        } catch (err) {
          console.error('Error checking decryption status:', err);
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            setPollingInterval(null);
            reject(err);
          }
        }
      }, 5000); // Poll every 5 seconds to match ViewMyContribution and avoid rate limits

      setPollingInterval(interval);
    });
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
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <button
          onClick={() => router.push('/')}
          className="mb-4 sm:mb-6 text-purple-600 hover:text-purple-700 font-medium flex items-center text-sm sm:text-base"
        >
          ← Back to Campaigns
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Campaign Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {campaign.title}
                </h1>
                {campaign.cancelled && (
                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                    Cancelled
                  </span>
                )}
                {campaign.finalized && !campaign.cancelled && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                    Finalized
                  </span>
                )}
                {!campaign.finalized && !campaign.cancelled && isExpired && (
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                    Ended
                  </span>
                )}
                {!campaign.finalized && !campaign.cancelled && !isExpired && (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                Campaign Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <span className="text-xs sm:text-sm text-gray-500 block mb-1">
                    Target Amount
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-purple-600">
                    {targetInEth} ETH
                  </span>
                </div>

                <div>
                  <span className="text-xs sm:text-sm text-gray-500 block mb-1">
                    Deadline
                  </span>
                  <span className="text-base sm:text-lg font-medium text-gray-900">
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                  🔐 Encrypted Data
                </h2>
                <div className="space-y-4">
                  <ViewCampaignTotal campaignId={campaignId} isOwner={isOwner} />
                  <ViewMyContribution
                    key={contributionKey}
                    campaignId={campaignId}
                    externalProcessing={isClaimingProcess}
                  />
                </div>
              </div>
            )}

            {/* Token Balance Section */}
            {authenticated && campaign.finalized && campaign.tokenAddress && campaign.tokenAddress !== '0x0000000000000000000000000000000000000000' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                  💰 Campaign Tokens
                </h2>
                <CampaignTokenBalance
                  key={tokenBalanceKey}
                  tokenAddress={campaign.tokenAddress}
                  campaignTitle={campaign.title}
                />
              </div>
            )}

            {/* Owner Actions */}
            {isOwner && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                  Campaign Management
                </h2>

                {actionSuccess && (
                  <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">{actionSuccess}</p>
                  </div>
                )}

                {canFinalize && (
                  <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      ⚠️ <strong>Before finalizing:</strong> Make sure you have decrypted the total raised amount above.
                      You will need to provide token name and symbol when finalizing.
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  {canFinalize && (
                    <button
                      onClick={handleFinalize}
                      disabled={loading}
                      className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
                    >
                      Finalize Campaign & Create Token
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3">
                  Campaign Status
                </h3>
                <p className="text-gray-600 text-sm">
                  {campaign.cancelled && 'This campaign has been cancelled.'}
                  {campaign.finalized && !campaign.cancelled && 'This campaign has been finalized.'}
                  {isExpired && !campaign.finalized && !campaign.cancelled && 'This campaign has ended.'}
                </p>

                {campaign.finalized && authenticated && campaign.tokenAddress !== '0x0000000000000000000000000000000000000000' && (
                  <div className="mt-4">
                    {hasClaimed ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg
                            className="h-5 w-5 text-green-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <p className="text-sm font-medium text-green-800">
                            Tokens Already Claimed
                          </p>
                        </div>
                        <p className="text-xs text-green-700">
                          You have successfully claimed your campaign tokens. Check your token balance above.
                        </p>
                      </div>
                    ) : (
                      <>
                        {claimingStep && (
                          <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <svg
                                className="animate-spin h-4 w-4 text-blue-600"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              <p className="text-sm text-blue-800">{claimingStep}</p>
                            </div>
                          </div>
                        )}
                        <button
                          onClick={handleClaim}
                          disabled={loading || isClaimingProcess || checkingClaimStatus}
                          className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {checkingClaimStatus ? (
                            <span className="flex items-center justify-center gap-2">
                              <svg
                                className="animate-spin h-5 w-5"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Checking...
                            </span>
                          ) : isClaimingProcess ? (
                            <span className="flex items-center justify-center gap-2">
                              <svg
                                className="animate-spin h-5 w-5"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Processing...
                            </span>
                          ) : (
                            'Claim Tokens'
                          )}
                        </button>
                        {!isClaimingProcess && !checkingClaimStatus && (
                          <p className="text-xs text-gray-500 mt-2 text-center">
                            💡 Your contribution will be automatically decrypted if needed
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {campaign.finalized && campaign.tokenAddress === '0x0000000000000000000000000000000000000000' && (
                  <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-xs text-yellow-800">
                      ⚠️ Campaign failed to reach target. No tokens were created.
                    </p>
                  </div>
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

      {/* Finalize Modal */}
      <FinalizeCampaignModal
        campaignId={campaignId}
        campaignTitle={campaign.title}
        isOpen={showFinalizeModal}
        onClose={() => setShowFinalizeModal(false)}
        onSuccess={handleFinalizeSuccess}
      />
    </>
  );
}