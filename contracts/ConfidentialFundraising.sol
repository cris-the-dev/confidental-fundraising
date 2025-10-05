// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";

/**
 * @title ConfidentialFundraising
 * @notice A private fundraising platform where contribution amounts remain encrypted
 * @dev Uses FHEVM to keep individual contributions private while tracking totals
 */
contract ConfidentialFundraising is SepoliaZamaFHEVMConfig {
    struct Campaign {
        address owner;
        string title;
        string description;
        euint64 totalRaised;        // Encrypted total amount raised
        uint64 targetAmount;        // Public goal (in wei)
        uint256 deadline;           // Campaign end time
        bool finalized;             // Whether campaign has been finalized
        bool cancelled;             // Whether campaign was cancelled
    }
    
    // Campaign ID => Campaign data
    mapping(uint256 => Campaign) public campaigns;
    
    // Campaign ID => Contributor address => Encrypted contribution amount
    mapping(uint256 => mapping(address => euint64)) private contributions;
    
    // Campaign ID => Contributor address => Has claimed tokens
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    
    // Total number of campaigns created
    uint256 public campaignCount;
    
    // Events
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed owner,
        string title,
        uint64 targetAmount,
        uint256 deadline
    );
    
    event ContributionMade(
        uint256 indexed campaignId,
        address indexed contributor
    );
    
    event CampaignFinalized(
        uint256 indexed campaignId,
        bool targetReached
    );
    
    event CampaignCancelled(uint256 indexed campaignId);
    
    event TokensClaimed(
        uint256 indexed campaignId,
        address indexed contributor
    );
    
    /**
     * @notice Create a new fundraising campaign
     * @param title Campaign title
     * @param description Campaign description
     * @param target Target amount in wei
     * @param duration Duration in seconds
     */
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
            totalRaised: TFHE.asEuint64(0),
            targetAmount: target,
            deadline: block.timestamp + duration,
            finalized: false,
            cancelled: false
        });
        
        // Grant contract permission to access totalRaised
        TFHE.allowThis(campaigns[campaignId].totalRaised);
        // Grant owner permission to see total
        TFHE.allow(campaigns[campaignId].totalRaised, msg.sender);
        
        emit CampaignCreated(campaignId, msg.sender, title, target, block.timestamp + duration);
        
        return campaignId;
    }
    
    /**
     * @notice Contribute encrypted amount to a campaign
     * @param campaignId ID of the campaign
     * @param encAmount Encrypted contribution amount
     * @param inputProof Zero-knowledge proof for the encrypted input
     */
    function contribute(
        uint256 campaignId,
        einput encAmount,
        bytes calldata inputProof
    ) external {
        Campaign storage campaign = campaigns[campaignId];
        
        require(campaignId < campaignCount, "Campaign does not exist");
        require(block.timestamp < campaign.deadline, "Campaign has ended");
        require(!campaign.finalized, "Campaign already finalized");
        require(!campaign.cancelled, "Campaign was cancelled");
        
        // Convert encrypted input with proof verification
        euint64 amount = TFHE.asEuint64(encAmount, inputProof);
        
        // Get existing contribution or zero if first time
        euint64 existingContribution = contributions[campaignId][msg.sender];
        
        // Add to user's contribution
        euint64 newContribution;
        if (TFHE.isInitialized(existingContribution)) {
            newContribution = TFHE.add(existingContribution, amount);
        } else {
            newContribution = amount;
        }
        
        contributions[campaignId][msg.sender] = newContribution;
        
        // Grant permissions
        TFHE.allowThis(newContribution);
        TFHE.allow(newContribution, msg.sender);
        
        // Update total raised homomorphically
        euint64 newTotal = TFHE.add(campaign.totalRaised, amount);
        campaign.totalRaised = newTotal;
        
        // Grant permissions for total
        TFHE.allowThis(newTotal);
        TFHE.allow(newTotal, campaign.owner);
        
        emit ContributionMade(campaignId, msg.sender);
    }
    
    /**
     * @notice Finalize a campaign after deadline
     * @param campaignId ID of the campaign
     * @dev In production, use Gateway async decryption to check if target reached
     */
    function finalizeCampaign(uint256 campaignId) external {
        Campaign storage campaign = campaigns[campaignId];
        
        require(campaignId < campaignCount, "Campaign does not exist");
        require(msg.sender == campaign.owner, "Only owner can finalize");
        require(block.timestamp >= campaign.deadline, "Campaign still active");
        require(!campaign.finalized, "Already finalized");
        require(!campaign.cancelled, "Campaign was cancelled");
        
        campaign.finalized = true;
        
        // Note: In production, you would use async decryption via Gateway
        // to check if target was reached. For this demo, we just finalize.
        // The owner can view the encrypted total using re-encryption on the frontend.
        emit CampaignFinalized(campaignId, true);
    }
    
    /**
     * @notice Cancel a campaign (only owner, before finalization)
     * @param campaignId ID of the campaign
     */
    function cancelCampaign(uint256 campaignId) external {
        Campaign storage campaign = campaigns[campaignId];
        
        require(campaignId < campaignCount, "Campaign does not exist");
        require(msg.sender == campaign.owner, "Only owner can cancel");
        require(!campaign.finalized, "Already finalized");
        require(!campaign.cancelled, "Already cancelled");
        
        campaign.cancelled = true;
        
        emit CampaignCancelled(campaignId);
    }
    
    /**
     * @notice Claim tokens after successful campaign
     * @param campaignId ID of the campaign
     */
    function claimTokens(uint256 campaignId) external {
        Campaign storage campaign = campaigns[campaignId];
        
        require(campaignId < campaignCount, "Campaign does not exist");
        require(campaign.finalized, "Campaign not finalized");
        require(!campaign.cancelled, "Campaign was cancelled");
        require(!hasClaimed[campaignId][msg.sender], "Already claimed");
        
        euint64 userContribution = contributions[campaignId][msg.sender];
        require(TFHE.isInitialized(userContribution), "No contribution found");
        
        // Verify user has permission to access their contribution
        require(TFHE.isSenderAllowed(userContribution), "Unauthorized access");
        
        // Mark as claimed
        hasClaimed[campaignId][msg.sender] = true;
        
        // In a real implementation, this would calculate proportional token allocation
        // and transfer tokens. For this demo, we just emit an event.
        
        emit TokensClaimed(campaignId, msg.sender);
    }
    
    /**
     * @notice Get campaign details
     * @param campaignId ID of the campaign
     */
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
    
    /**
     * @notice Get encrypted total raised (only owner can decrypt via re-encryption)
     * @param campaignId ID of the campaign
     */
    function getEncryptedTotal(uint256 campaignId) external view returns (euint64) {
        require(campaignId < campaignCount, "Campaign does not exist");
        return campaigns[campaignId].totalRaised;
    }
    
    /**
     * @notice Get encrypted contribution for the caller
     * @param campaignId ID of the campaign
     */
    function getMyContribution(uint256 campaignId) external view returns (euint64) {
        require(campaignId < campaignCount, "Campaign does not exist");
        return contributions[campaignId][msg.sender];
    }
}