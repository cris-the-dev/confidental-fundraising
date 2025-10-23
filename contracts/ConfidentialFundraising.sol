// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import "./interface/IDecryptionCallbacks.sol";
import "./core/FundraisingStruct.sol";
import "./interface/IFundraisingEvents.sol";
import "./interface/IFundraisingErrors.sol";
import "./storage/FundraisingStorage.sol";

/**
 * @title ConfidentialFundraising
 * @notice A private fundraising platform where contribution amounts remain encrypted
 * @dev Uses FHEVM to keep individual contributions private while tracking totals
 * 
 * contribution amount and target will be stored as ether, not wei for reducing complexity while crypting
 */
contract ConfidentialFundraising is SepoliaConfig, IFundraisingEvents, IFundraisingErrors, FundraisingStorage {
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
        uint8 target,
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
        
        emit CampaignCreated(campaignId, msg.sender, title, target, block.timestamp + duration);
        return campaignId;
    }
    
    function contribute(
        uint16 campaignId,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        FundraisingStruct.Campaign storage campaign = campaigns[campaignId];
        
        if (campaignId > campaignCount) {
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
        
        euint64 existingContribution = encryptedContributions[campaignId][msg.sender];
        
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
        
        emit ContributionMade(campaignId, msg.sender);
    }
    
    function finalizeCampaign(uint16 campaignId) onlyCampaignOwner(campaignId) external {
        FundraisingStruct.Campaign storage campaign = campaigns[campaignId];
        
        if (campaignId > campaignCount) {
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
    
    function cancelCampaign(uint16 campaignId) onlyCampaignOwner(campaignId) external {
        FundraisingStruct.Campaign storage campaign = campaigns[campaignId];
        
        if (campaignId > campaignCount) {
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
        
        if (campaignId > campaignCount) {
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
        
        euint64 userContribution = encryptedContributions[campaignId][msg.sender];
        
        if (!FHE.isInitialized(userContribution)) {
            revert NoContributionFound();
        }

        if (!FHE.isSenderAllowed(userContribution)) {
            revert UnauthorizedAccess();
        }
        
        hasClaimed[campaignId][msg.sender] = true;
        emit TokensClaimed(campaignId, msg.sender);
    }
    
    function getCampaign(uint16 campaignId) external view returns (
        address owner,
        string memory title,
        string memory description,
        uint64 targetAmount,
        uint256 deadline,
        bool finalized,
        bool cancelled
    ) {
        if (campaignId > campaignCount) {
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
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(encryptedContributions[campaignId][msg.sender]);

        uint256 requestId = FHE.requestDecryption(handles, IDecryptionCallbacks.callbackDecryptMyContribution.selector);

        decryptMyContributionRequest[requestId] = FundraisingStruct.DecryptUserContributionRequest({
            userAddress: msg.sender,
            campaignId: campaignId
        });

        decryptMyContributionStatus[campaignId][msg.sender] = FundraisingStruct.DecryptStatus.PROCESSING;
    }

    function getMyContribution(uint16 campaignId) external view returns(uint64) {
        uint64 decryptedContribution = decryptedContributions[campaignId][msg.sender];

        if (decryptedContribution != 0) {
            return decryptedContribution;
        }

        if (decryptMyContributionStatus[campaignId][msg.sender] == FundraisingStruct.DecryptStatus.PROCESSING) {
            revert DataProcessing();
        }

        revert ContributionNotFound();
    }
}