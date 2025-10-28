// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import "./interface/IDecryptionCallbacks.sol";
import "./interface/IFundraisingEvents.sol";
import "./interface/IFundraisingErrors.sol";
import "./storage/FundraisingStorage.sol";
import "./interface/impl/DecryptionCallback.sol";
import "./ShareVault.sol";
import "./core/CampaignToken.sol";
import "./ShareVault.sol";

/**
 * @title ConfidentialFundraising
 * @notice A privacy-preserving crowdfunding platform using fully homomorphic encryption (FHE)
 * @dev This contract enables confidential fundraising campaigns where contribution amounts remain encrypted
 * on-chain. It leverages FHEVM to perform operations on encrypted data without revealing individual
 * contribution amounts. Only authorized parties can decrypt specific values after requesting decryption.
 *
 * Key Features:
 * - Encrypted contribution tracking using FHE
 * - Decentralized fund management through ShareVault
 * - Automatic token distribution for successful campaigns
 * - Refund mechanism for failed campaigns
 * - Time-based campaign deadlines
 *
 * @custom:security-contact security@example.com
 *
 * Note: Contribution amounts and targets are stored in wei, not ether units
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

    ShareVault public immutable shareVault;

    modifier onlyCampaignOwner(uint16 campaignId) {
        if (msg.sender != campaigns[campaignId].owner) {
            revert OnlyOwner();
        }
        _;
    }

    constructor(address _shareVault) {
        shareVault = ShareVault(_shareVault);
    }

    /**
     * @notice Creates a new fundraising campaign
     * @dev Initializes an encrypted total raised counter and sets campaign parameters.
     * The campaign owner can later finalize it after the deadline to distribute tokens or refunds.
     * @param title The campaign title (must not be empty)
     * @param description The campaign description
     * @param target The funding target amount in wei (must be greater than 0)
     * @param duration The campaign duration in seconds (must be greater than 0)
     * @return The newly created campaign ID
     * @custom:emits CampaignCreated
     */
    function createCampaign(
        string calldata title,
        string calldata description,
        uint64 target,
        uint256 duration
    ) external returns (uint256) {
        if (target == 0) {
            revert InvalidTarget();
        }
        if (duration == 0) {
            revert InvalidDuration();
        }
        if (bytes(title).length == 0) {
            revert EmptyTitle();
        }

        uint16 campaignId = campaignCount++;

        campaigns[campaignId] = FundraisingStruct.Campaign({
            owner: msg.sender,
            title: title,
            description: description,
            totalRaised: FHE.asEuint64(0),
            targetAmount: target,
            deadline: block.timestamp + duration,
            finalized: false,
            cancelled: false,
            tokenAddress: address(0)
        });

        FHE.allowThis(campaigns[campaignId].totalRaised);
        FHE.allow(campaigns[campaignId].totalRaised, address(shareVault));
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

    /**
     * @notice Make an encrypted contribution to a campaign
     * @dev The contribution amount is encrypted and locked in the ShareVault. The actual amount
     * remains private on-chain and can only be decrypted by authorized parties. Funds are locked
     * until the campaign is finalized (either transferred to owner or refunded).
     * @param campaignId The ID of the campaign to contribute to
     * @param encryptedAmount The encrypted contribution amount (must be pre-encrypted by user)
     * @param inputProof Zero-knowledge proof validating the encrypted input
     * @custom:emits ContributionMade
     */
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

        FHE.allowThis(amount);
        FHE.allow(amount, address(shareVault));

        // Lock funds in ShareVault
        shareVault.lockFunds(msg.sender, campaignId, amount);

        // Track contributor
        if (!hasContributed[campaignId][msg.sender]) {
            campaignContributors[campaignId].push(msg.sender);
            hasContributed[campaignId][msg.sender] = true;
        }

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
        FHE.allow(newContribution, address(shareVault));
        FHE.allow(newContribution, msg.sender);

        euint64 newTotal = FHE.add(campaign.totalRaised, amount);
        campaign.totalRaised = newTotal;

        FHE.allowThis(newTotal);
        FHE.allow(newTotal, address(shareVault));
        FHE.allow(newTotal, campaign.owner);

        emit ContributionMade(campaignId, msg.sender);
    }

    /**
     * @notice Finalizes a campaign after its deadline has passed
     * @dev This function can only be called by the campaign owner after the deadline.
     * The owner must first call requestTotalRaisedDecryption() to decrypt the total amount raised.
     * If the target is reached, a new ERC20 token is deployed and funds are transferred to the owner.
     * If the target is not reached, all locked funds are unlocked for contributor withdrawal.
     * @param campaignId The ID of the campaign to finalize
     * @param tokenName The name for the campaign token (required if target reached, can be empty otherwise)
     * @param tokenSymbol The symbol for the campaign token (required if target reached, can be empty otherwise)
     * @custom:emits CampaignFinalized
     * @custom:emits CampaignFailed (if target not reached)
     */
    function finalizeCampaign(
        uint16 campaignId,
        string calldata tokenName,
        string calldata tokenSymbol
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

        // Check if target was reached (need to decrypt total first)
        // Owner must call requestTotalRaisedDecryption first, then call this function
        CommonStruct.Uint64ResultWithExp
            memory decryptedWithExp = decryptedTotalRaised[campaignId];
        uint64 totalRaised = decryptedWithExp.data;

        if (totalRaised == 0) {
            revert TotalRaisedNotDecrypted();
        }

        campaign.finalized = true;

        if (totalRaised >= campaign.targetAmount) {
            // TARGET REACHED - Deploy token and transfer funds
            if (bytes(tokenName).length == 0) {
                revert TokenNameRequired();
            }
            if (bytes(tokenSymbol).length == 0) {
                revert TokenSymbolRequired();
            }

            // Deploy campaign token
            CampaignToken token = new CampaignToken(
                tokenName,
                tokenSymbol,
                campaignId,
                address(this) // Campaign contract is token owner
            );
            campaign.tokenAddress = address(token);

            // Transfer all locked funds to owner
            address[] memory contributors = campaignContributors[campaignId];
            for (uint256 i = 0; i < contributors.length; i++) {
                address contributor = contributors[i];
                shareVault.transferLockedFunds(
                    contributor,
                    campaign.owner,
                    campaignId
                );
            }

            emit CampaignFinalized(campaignId, true);
        } else {
            // TARGET NOT REACHED - Unlock all funds (campaign failed)
            address[] memory contributors = campaignContributors[campaignId];
            for (uint256 i = 0; i < contributors.length; i++) {
                shareVault.unlockFunds(contributors[i], campaignId);
            }

            emit CampaignFailed(campaignId);
            emit CampaignFinalized(campaignId, false);
        }
    }

    /**
     * @notice Cancels an active campaign before its deadline
     * @dev Only the campaign owner can cancel. This immediately unlocks all contributor funds
     * and prevents any further contributions. The campaign cannot be finalized after cancellation.
     * @param campaignId The ID of the campaign to cancel
     * @custom:emits CampaignCancelled
     */
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

        // Unlock all funds
        address[] memory contributors = campaignContributors[campaignId];
        for (uint256 i = 0; i < contributors.length; i++) {
            shareVault.unlockFunds(contributors[i], campaignId);
        }

        emit CampaignCancelled(campaignId);
    }

    /**
     * @notice Claims campaign tokens for a contributor after successful campaign finalization
     * @dev Contributors must first decrypt their contribution amount by calling requestMyContributionDecryption().
     * Tokens are distributed proportionally based on contribution amount relative to the target amount.
     * Each contributor can only claim once.
     * @param campaignId The ID of the successful campaign
     * @custom:emits TokensClaimed
     * @custom:emits TokensDistributed
     */
    function claimTokens(uint16 campaignId) external {
        FundraisingStruct.Campaign storage campaign = campaigns[campaignId];

        if (campaignId >= campaignCount) {
            revert CampaignNotExist();
        }

        if (!campaign.finalized) {
            revert CampaignNotFinalized();
        }

        if (campaign.tokenAddress == address(0)) {
            revert NoTokensToClaim();
        }

        if (hasClaimed[campaignId][msg.sender]) {
            revert AlreadyClaimed();
        }

        // User must have decrypted their contribution first
        CommonStruct.Uint64ResultWithExp
            memory decryptedWithExp = decryptedContributions[campaignId][
                msg.sender
            ];
        uint64 contributionAmount = decryptedWithExp.data;

        if (contributionAmount == 0) {
            revert ContributionNotDecrypted();
        }

        // Calculate tokens based on proportion of target
        // Formula: (userContribution / targetAmount) * 1_000_000_000 tokens
        // To avoid precision loss: (userContribution * 1_000_000_000) / targetAmount

        uint256 TOKEN_SUPPLY = 1_000_000_000 * 10 ** 18; // 1 billion tokens with 18 decimals
        uint256 tokenAmount = (uint256(contributionAmount) * TOKEN_SUPPLY) /
            uint256(campaign.targetAmount);

        CampaignToken token = CampaignToken(campaign.tokenAddress);
        token.mint(msg.sender, tokenAmount);

        hasClaimed[campaignId][msg.sender] = true;

        emit TokensClaimed(campaignId, msg.sender);
        emit TokensDistributed(campaignId, msg.sender, tokenAmount);
    }

    /**
     * @notice Retrieves public campaign information
     * @dev Returns non-sensitive campaign data. Encrypted contribution amounts are not included.
     * @param campaignId The ID of the campaign
     * @return owner The address of the campaign creator
     * @return title The campaign title
     * @return description The campaign description
     * @return targetAmount The funding target in wei
     * @return deadline The campaign deadline timestamp
     * @return finalized Whether the campaign has been finalized
     * @return cancelled Whether the campaign has been cancelled
     */
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
            bool cancelled,
            address tokenAddress
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
            campaign.cancelled,
            campaign.tokenAddress
        );
    }

    /**
     * @notice Requests decryption of the caller's contribution amount
     * @dev Initiates an asynchronous decryption process. The result will be available after
     * the decryption callback is executed. Use getMyContribution() to retrieve the decrypted value.
     * @param campaignId The ID of the campaign
     * @custom:emits DecryptionRequested (via callback system)
     */
    function requestMyContributionDecryption(uint16 campaignId) public {
        euint64 userContribution = encryptedContributions[campaignId][
            msg.sender
        ];
        if (!FHE.isInitialized(userContribution)) {
            revert ContributionNotFound();
        }

        if (
            decryptMyContributionStatus[campaignId][msg.sender] ==
            CommonStruct.DecryptStatus.PROCESSING
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

        decryptMyContributionStatus[campaignId][msg.sender] = CommonStruct
            .DecryptStatus
            .PROCESSING;
    }

    /**
     * @notice Retrieves the caller's decrypted contribution amount
     * @dev The contribution must be decrypted first by calling requestMyContributionDecryption().
     * The decrypted value is cached with an expiration time.
     * @param campaignId The ID of the campaign
     * @return The decrypted contribution amount in wei
     */
    function getMyContribution(
        uint16 campaignId
    ) external view returns (uint64) {
        CommonStruct.Uint64ResultWithExp
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
            CommonStruct.DecryptStatus.PROCESSING
        ) {
            revert DataProcessing();
        }

        revert MyContributionNotDecrypted();
    }

    /**
     * @notice Requests decryption of the total amount raised for a campaign
     * @dev Only the campaign owner can request this. Required before finalizing a campaign.
     * Initiates an asynchronous decryption process. Use getTotalRaised() to retrieve the result.
     * @param campaignId The ID of the campaign
     * @custom:emits DecryptionRequested (via callback system)
     */
    function requestTotalRaisedDecryption(
        uint16 campaignId
    ) public onlyCampaignOwner(campaignId) {
        if (
            decryptMyContributionStatus[campaignId][msg.sender] ==
            CommonStruct.DecryptStatus.PROCESSING
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
        decryptTotalRaisedStatus[campaignId] = CommonStruct
            .DecryptStatus
            .PROCESSING;
    }

    /**
     * @notice Retrieves the decrypted total amount raised for a campaign
     * @dev Only the campaign owner can call this. The total must be decrypted first by calling
     * requestTotalRaisedDecryption(). The decrypted value is cached with an expiration time.
     * @param campaignId The ID of the campaign
     * @return The decrypted total amount raised in wei
     */
    function getTotalRaised(
        uint16 campaignId
    ) external view onlyCampaignOwner(campaignId) returns (uint64) {
        CommonStruct.Uint64ResultWithExp
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
            CommonStruct.DecryptStatus.PROCESSING
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
    )
        external
        view
        onlyCampaignOwner(campaignId)
        returns (
            CommonStruct.DecryptStatus status,
            uint64 totalRaised,
            uint256 cacheExpiry
        )
    {
        status = decryptTotalRaisedStatus[campaignId];
        CommonStruct.Uint64ResultWithExp
            memory decryptedWithExp = decryptedTotalRaised[campaignId];

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
    )
        external
        view
        returns (
            CommonStruct.DecryptStatus status,
            uint64 contribution,
            uint256 cacheExpiry
        )
    {
        status = decryptMyContributionStatus[campaignId][user];
        CommonStruct.Uint64ResultWithExp
            memory decryptedWithExp = decryptedContributions[campaignId][user];

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

    /**
     * @notice Retrieves the list of all contributors to a campaign
     * @dev Returns addresses of all users who have made at least one contribution.
     * Does not reveal contribution amounts.
     * @param campaignId The ID of the campaign
     * @return Array of contributor addresses
     */
    function getCampaignContributors(
        uint16 campaignId
    ) external view returns (address[] memory) {
        return campaignContributors[campaignId];
    }

    /**
     * @notice Gets the encrypted contribution amount for a user in a campaign
     * @dev For user-side decryption. User must have been granted FHE permissions.
     * @param campaignId The ID of the campaign
     * @param user The address of the contributor
     * @return The encrypted contribution amount
     */
    function getEncryptedContribution(
        uint16 campaignId,
        address user
    ) external view returns (euint64) {
        return encryptedContributions[campaignId][user];
    }

    /**
     * @notice Gets the encrypted total raised for a campaign
     * @dev For user-side decryption. Campaign owner must have been granted FHE permissions.
     * @param campaignId The ID of the campaign
     * @return The encrypted total raised amount
     */
    function getEncryptedTotalRaised(
        uint16 campaignId
    ) external view returns (euint64) {
        FundraisingStruct.Campaign memory campaign = campaigns[campaignId];

        return campaign.totalRaised;
    }
}
