// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import "./interface/IDecryptionCallbacks.sol";
import "./core/FundraisingStruct.sol";
import "./interface/IFundraisingEvents.sol";
import "./interface/IFundraisingErrors.sol";
import "./storage/FundraisingStorage.sol";
import "./interface/impl/DecryptionCallback.sol";

/**
 * @title ConfidentialFundraising
 * @notice A private fundraising platform where contribution amounts remain encrypted
 * @dev Uses FHEVM to keep individual contributions private while tracking totals
 *
 * contribution amount and target will be stored as ether, not wei for reducing complexity while crypting
 */
contract ConfidentialFundraising is
    SepoliaConfig,
    IFundraisingEvents,
    IFundraisingErrors,
    FundraisingStorage,
    DecryptionCallbacks
{
    using FHE for euint16;
    using FHE for euint64;
    using FHE for ebool;

    modifier onlyCampaignOwner(uint16 campaignId) {
        if (msg.sender != campaigns[campaignId].owner) {
            revert OnlyOwner();
        }
        _;
    }

    function createCampaign(
        string calldata title,
        string calldata description,
        uint64 target,
        uint256 duration
    ) external returns (uint256) {
        require(target > 0, "Target must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        require(bytes(title).length > 0, "Title cannot be empty");

        uint16 campaignId = campaignCount++;

        campaigns[campaignId] = FundraisingStruct.Campaign({
            owner: msg.sender,
            title: title,
            description: description,
            totalRaised: FHE.asEuint64(0),
            targetAmount: target,
            deadline: block.timestamp + duration,
            finalized: false,
            cancelled: false
        });

        FHE.allowThis(campaigns[campaignId].totalRaised);
        FHE.allow(campaigns[campaignId].totalRaised, msg.sender);

        emit CampaignCreated(
            campaignId,
            msg.sender,
            title,
            target,
            block.timestamp + duration
        );
        return campaignId;
    }

    function contribute(
        uint16 campaignId,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        FundraisingStruct.Campaign storage campaign = campaigns[campaignId];

        if (campaignId >= campaignCount) {
            revert CampaignNotExist();
        }

        if (block.timestamp > campaign.deadline) {
            revert CampaignEnded();
        }

        if (campaign.finalized) {
            revert AlreadyFinalized();
        }

        if (campaign.cancelled) {
            revert AlreadyCancelled();
        }

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        euint64 existingContribution = encryptedContributions[campaignId][
            msg.sender
        ];

        euint64 newContribution;
        if (FHE.isInitialized(existingContribution)) {
            newContribution = FHE.add(existingContribution, amount);
        } else {
            newContribution = amount;
        }

        encryptedContributions[campaignId][msg.sender] = newContribution;

        FHE.allowThis(newContribution);
        FHE.allow(newContribution, msg.sender);

        euint64 newTotal = FHE.add(campaign.totalRaised, amount);
        campaign.totalRaised = newTotal;

        FHE.allowThis(newTotal);
        FHE.allow(newTotal, campaign.owner);

        decryptMyContributionStatus[campaignId][msg.sender] = FundraisingStruct.DecryptStatus.NOT_STARTED;
        emit ContributionMade(campaignId, msg.sender);
    }

    function finalizeCampaign(
        uint16 campaignId
    ) external onlyCampaignOwner(campaignId) {
        FundraisingStruct.Campaign storage campaign = campaigns[campaignId];

        if (campaignId >= campaignCount) {
            revert CampaignNotExist();
        }

        if (block.timestamp < campaign.deadline) {
            revert CampaignStillActive();
        }

        if (campaign.finalized) {
            revert AlreadyFinalized();
        }

        if (campaign.cancelled) {
            revert AlreadyCancelled();
        }

        campaign.finalized = true;
        emit CampaignFinalized(campaignId, true);
    }

    function cancelCampaign(
        uint16 campaignId
    ) external onlyCampaignOwner(campaignId) {
        FundraisingStruct.Campaign storage campaign = campaigns[campaignId];

        if (campaignId >= campaignCount) {
            revert CampaignNotExist();
        }

        if (campaign.finalized) {
            revert AlreadyFinalized();
        }

        if (campaign.cancelled) {
            revert AlreadyCancelled();
        }

        campaign.cancelled = true;
        emit CampaignCancelled(campaignId);
    }

    function claimTokens(uint16 campaignId) external {
        FundraisingStruct.Campaign storage campaign = campaigns[campaignId];

        if (campaignId >= campaignCount) {
            revert CampaignNotExist();
        }

        if (!campaign.finalized) {
            revert CampaignNotFinalized();
        }

        if (campaign.cancelled) {
            revert AlreadyCancelled();
        }

        if (hasClaimed[campaignId][msg.sender]) {
            revert AlreadyClaimed();
        }

        euint64 userContribution = encryptedContributions[campaignId][
            msg.sender
        ];

        if (!FHE.isInitialized(userContribution)) {
            revert ContributionNotFound();
        }

        if (!FHE.isSenderAllowed(userContribution)) {
            revert UnauthorizedAccess();
        }

        hasClaimed[campaignId][msg.sender] = true;
        emit TokensClaimed(campaignId, msg.sender);
    }

    function getCampaign(
        uint16 campaignId
    )
        external
        view
        returns (
            address owner,
            string memory title,
            string memory description,
            uint64 targetAmount,
            uint256 deadline,
            bool finalized,
            bool cancelled
        )
    {
        if (campaignId >= campaignCount) {
            revert CampaignNotExist();
        }
        FundraisingStruct.Campaign storage campaign = campaigns[campaignId];

        return (
            campaign.owner,
            campaign.title,
            campaign.description,
            campaign.targetAmount,
            campaign.deadline,
            campaign.finalized,
            campaign.cancelled
        );
    }

    function requestMyContributionDecryption(uint16 campaignId) public {
        euint64 userContribution = encryptedContributions[campaignId][
            msg.sender
        ];
        if (!FHE.isInitialized(userContribution)) {
            revert ContributionNotFound();
        }

        if (
            decryptMyContributionStatus[campaignId][msg.sender] ==
            FundraisingStruct.DecryptStatus.PROCESSING
        ) {
            revert DecryptAlreadyInProgress();
        }

        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(
            encryptedContributions[campaignId][msg.sender]
        );

        uint256 requestId = FHE.requestDecryption(
            handles,
            IDecryptionCallbacks.callbackDecryptMyContribution.selector
        );

        decryptMyContributionRequest[requestId] = FundraisingStruct
            .DecryptUserContributionRequest({
                userAddress: msg.sender,
                campaignId: campaignId
            });

        decryptMyContributionStatus[campaignId][msg.sender] = FundraisingStruct
            .DecryptStatus
            .PROCESSING;
    }

    function getMyContribution(
        uint16 campaignId
    ) external view returns (uint64) {
        FundraisingStruct.Uint64ResultWithExp
            memory decryptedWithExp = decryptedContributions[campaignId][
                msg.sender
            ];

        uint64 decryptedContribution = decryptedWithExp.data;
        uint256 expTime = decryptedWithExp.exp;

        if (decryptedContribution != 0) {
            if (expTime < block.timestamp) {
                revert CacheExpired();
            }
            return decryptedContribution;
        }

        if (
            decryptMyContributionStatus[campaignId][msg.sender] ==
            FundraisingStruct.DecryptStatus.PROCESSING
        ) {
            revert DataProcessing();
        }

        revert MyContributionNotDecrypted();
    }

    function requestTotalRaisedDecryption(
        uint16 campaignId
    ) public onlyCampaignOwner(campaignId) {
        if (
            decryptMyContributionStatus[campaignId][msg.sender] ==
            FundraisingStruct.DecryptStatus.PROCESSING
        ) {
            revert DecryptAlreadyInProgress();
        }

        FundraisingStruct.Campaign storage campaign = campaigns[campaignId];

        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(campaign.totalRaised);

        uint256 requestId = FHE.requestDecryption(
            handles,
            IDecryptionCallbacks.callbackDecryptTotalRaised.selector
        );

        decryptTotalRaisedRequest[requestId] = campaignId;
        decryptTotalRaisedStatus[campaignId] = FundraisingStruct
            .DecryptStatus
            .PROCESSING;
    }

    function getTotalRaised(
        uint16 campaignId
    ) external view onlyCampaignOwner(campaignId) returns (uint64) {
        FundraisingStruct.Uint64ResultWithExp
            memory decryptedWithExp = decryptedTotalRaised[campaignId];

        uint64 decryptedTotalRaised = decryptedWithExp.data;
        uint256 expTime = decryptedWithExp.exp;

        if (decryptedTotalRaised != 0) {
            if (expTime < block.timestamp) {
                revert CacheExpired();
            }
            return decryptedTotalRaised;
        }

        if (
            decryptTotalRaisedStatus[campaignId] ==
            FundraisingStruct.DecryptStatus.PROCESSING
        ) {
            revert DataProcessing();
        }

        revert TotalRaisedNotDecrypted();
    }

    /**
     * @notice Get the decryption status and cached total raised for a campaign
     * @param campaignId The campaign ID
     * @return status The decryption status (0=NONE, 1=PROCESSING, 2=DECRYPTED)
     * @return totalRaised The decrypted total raised (0 if not decrypted)
     * @return cacheExpiry The cache expiry timestamp
     */
    function getTotalRaisedStatus(
        uint16 campaignId
    ) external view onlyCampaignOwner(campaignId) returns (
        FundraisingStruct.DecryptStatus status,
        uint64 totalRaised,
        uint256 cacheExpiry
    ) {
        status = decryptTotalRaisedStatus[campaignId];
        FundraisingStruct.Uint64ResultWithExp memory decryptedWithExp = decryptedTotalRaised[campaignId];
        
        totalRaised = decryptedWithExp.data;
        cacheExpiry = decryptedWithExp.exp;
        
        return (status, totalRaised, cacheExpiry);
    }

    /**
     * @notice Get the decryption status and cached contribution for a user
     * @param campaignId The campaign ID
     * @param user The user address
     * @return status The decryption status (0=NONE, 1=PROCESSING, 2=DECRYPTED)
     * @return contribution The decrypted contribution (0 if not decrypted)
     * @return cacheExpiry The cache expiry timestamp
     */
    function getContributionStatus(
        uint16 campaignId,
        address user
    ) external view returns (
        FundraisingStruct.DecryptStatus status,
        uint64 contribution,
        uint256 cacheExpiry
    ) {
        status = decryptMyContributionStatus[campaignId][user];
        FundraisingStruct.Uint64ResultWithExp memory decryptedWithExp = decryptedContributions[campaignId][user];
        
        contribution = decryptedWithExp.data;
        cacheExpiry = decryptedWithExp.exp;
        
        return (status, contribution, cacheExpiry);
    }

    /**
     * @notice Check if user has any contribution to a campaign
     * @param campaignId The campaign ID
     * @param user The user address
     * @return hasContribution True if user has contributed
     */
    function hasContribution(
        uint16 campaignId,
        address user
    ) external view returns (bool) {
        return FHE.isInitialized(encryptedContributions[campaignId][user]);
    }
}
