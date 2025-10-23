// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title ConfidentialFundraising
 * @notice A private fundraising platform where contribution amounts remain encrypted
 * @dev Uses FHEVM to keep individual contributions private while tracking totals
 */
contract ConfidentialFundraising is SepoliaConfig {
    using FHE for euint64;
    using FHE for ebool;
    
    struct Campaign {
        address owner;
        string title;
        string description;
        euint64 totalRaised;
        uint64 targetAmount;
        uint256 deadline;
        bool finalized;
        bool cancelled;
    }
    
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => euint64)) private contributions;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    uint256 public campaignCount;
    
    event CampaignCreated(uint256 indexed campaignId, address indexed owner, string title, uint64 targetAmount, uint256 deadline);
    event ContributionMade(uint256 indexed campaignId, address indexed contributor);
    event CampaignFinalized(uint256 indexed campaignId, bool targetReached);
    event CampaignCancelled(uint256 indexed campaignId);
    event TokensClaimed(uint256 indexed campaignId, address indexed contributor);
    
    function createCampaign(
        string calldata title,
        string calldata description,
        uint64 target,
        uint256 duration
    ) external returns (uint256) {
        require(target > 0, "Target must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        require(bytes(title).length > 0, "Title cannot be empty");
        
        uint256 campaignId = campaignCount++;
        
        campaigns[campaignId] = Campaign({
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
        uint256 campaignId,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        Campaign storage campaign = campaigns[campaignId];
        
        require(campaignId < campaignCount, "Campaign does not exist");
        require(block.timestamp < campaign.deadline, "Campaign has ended");
        require(!campaign.finalized, "Campaign already finalized");
        require(!campaign.cancelled, "Campaign was cancelled");
        
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        
        euint64 existingContribution = contributions[campaignId][msg.sender];
        
        euint64 newContribution;
        if (FHE.isInitialized(existingContribution)) {
            newContribution = FHE.add(existingContribution, amount);
        } else {
            newContribution = amount;
        }
        
        contributions[campaignId][msg.sender] = newContribution;
        
        FHE.allowThis(newContribution);
        FHE.allow(newContribution, msg.sender);
        
        euint64 newTotal = FHE.add(campaign.totalRaised, amount);
        campaign.totalRaised = newTotal;
        
        FHE.allowThis(newTotal);
        FHE.allow(newTotal, campaign.owner);
        
        emit ContributionMade(campaignId, msg.sender);
    }
    
    function finalizeCampaign(uint256 campaignId) external {
        Campaign storage campaign = campaigns[campaignId];
        
        require(campaignId < campaignCount, "Campaign does not exist");
        require(msg.sender == campaign.owner, "Only owner can finalize");
        require(block.timestamp >= campaign.deadline, "Campaign still active");
        require(!campaign.finalized, "Already finalized");
        require(!campaign.cancelled, "Campaign was cancelled");
        
        campaign.finalized = true;
        emit CampaignFinalized(campaignId, true);
    }
    
    function cancelCampaign(uint256 campaignId) external {
        Campaign storage campaign = campaigns[campaignId];
        
        require(campaignId < campaignCount, "Campaign does not exist");
        require(msg.sender == campaign.owner, "Only owner can cancel");
        require(!campaign.finalized, "Already finalized");
        require(!campaign.cancelled, "Already cancelled");
        
        campaign.cancelled = true;
        emit CampaignCancelled(campaignId);
    }
    
    function claimTokens(uint256 campaignId) external {
        Campaign storage campaign = campaigns[campaignId];
        
        require(campaignId < campaignCount, "Campaign does not exist");
        require(campaign.finalized, "Campaign not finalized");
        require(!campaign.cancelled, "Campaign was cancelled");
        require(!hasClaimed[campaignId][msg.sender], "Already claimed");
        
        euint64 userContribution = contributions[campaignId][msg.sender];
        require(FHE.isInitialized(userContribution), "No contribution found");
        require(FHE.isSenderAllowed(userContribution), "Unauthorized access");
        
        hasClaimed[campaignId][msg.sender] = true;
        emit TokensClaimed(campaignId, msg.sender);
    }
    
    function getCampaign(uint256 campaignId) external view returns (
        address owner,
        string memory title,
        string memory description,
        uint64 targetAmount,
        uint256 deadline,
        bool finalized,
        bool cancelled
    ) {
        require(campaignId < campaignCount, "Campaign does not exist");
        Campaign storage campaign = campaigns[campaignId];
        
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
    
    function getEncryptedTotal(uint256 campaignId) external view returns (euint64) {
        require(campaignId < campaignCount, "Campaign does not exist");
        return campaigns[campaignId].totalRaised;
    }
    
    function getMyContribution(uint256 campaignId) external view returns (euint64) {
        require(campaignId < campaignCount, "Campaign does not exist");
        return contributions[campaignId][msg.sender];
    }
}