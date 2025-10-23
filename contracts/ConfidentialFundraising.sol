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
 */
contract ConfidentialFundraising is SepoliaConfig, IFundraisingEvents, IFundraisingErrors, FundraisingStorage {
    using FHE for euint16;
    using FHE for euint64;
    using FHE for ebool;
    
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
        
        require(campaignId < campaignCount, "Campaign does not exist");
        require(block.timestamp < campaign.deadline, "Campaign has ended");
        require(!campaign.finalized, "Campaign already finalized");
        require(!campaign.cancelled, "Campaign was cancelled");
        
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
    
    function finalizeCampaign(uint16 campaignId) external {
        FundraisingStruct.Campaign storage campaign = campaigns[campaignId];
        
        require(campaignId < campaignCount, "Campaign does not exist");
        require(msg.sender == campaign.owner, "Only owner can finalize");
        require(block.timestamp >= campaign.deadline, "Campaign still active");
        require(!campaign.finalized, "Already finalized");
        require(!campaign.cancelled, "Campaign was cancelled");
        
        campaign.finalized = true;
        emit CampaignFinalized(campaignId, true);
    }
    
    function cancelCampaign(uint16 campaignId) external {
        FundraisingStruct.Campaign storage campaign = campaigns[campaignId];
        
        require(campaignId < campaignCount, "Campaign does not exist");
        require(msg.sender == campaign.owner, "Only owner can cancel");
        require(!campaign.finalized, "Already finalized");
        require(!campaign.cancelled, "Already cancelled");
        
        campaign.cancelled = true;
        emit CampaignCancelled(campaignId);
    }
    
    function claimTokens(uint16 campaignId) external {
        FundraisingStruct.Campaign storage campaign = campaigns[campaignId];
        
        require(campaignId < campaignCount, "Campaign does not exist");
        require(campaign.finalized, "Campaign not finalized");
        require(!campaign.cancelled, "Campaign was cancelled");
        require(!hasClaimed[campaignId][msg.sender], "Already claimed");
        
        euint64 userContribution = encryptedContributions[campaignId][msg.sender];
        require(FHE.isInitialized(userContribution), "No contribution found");
        require(FHE.isSenderAllowed(userContribution), "Unauthorized access");
        
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
        require(campaignId < campaignCount, "Campaign does not exist");
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