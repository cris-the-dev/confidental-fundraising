// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import "./interface/IDecryptionCallbacks.sol";
import "./struct/CommonStruct.sol";
import "./struct/ShareVaultStruct.sol";
import "./interface/IShareVaultErrors.sol";
import "./interface/IShareVaultEvents.sol";
import "./core/EncryptedHelper.sol";
import "./interface/impl/DecryptionCallback.sol";

/**
 * @title ShareVault
 * @notice Manages user deposits and locked funds for campaigns with decryption-based withdrawals
 */
contract ShareVault is
    SepoliaConfig,
    IShareVaultEvents,
    IShareVaultErrors,
    ShareVaultStorage,
    DecryptionCallbacks
{
    using FHE for euint64;
    using FHE for ebool;

    modifier onlyCampaignContract() {
        if (msg.sender != campaignContract) {
            revert OnlyCampaignContract();
        }
        _;
    }

    address public owner;

    constructor() {
        campaignContract = address(0);
        owner = msg.sender;
    }

    function setCampaignContract(address _campaignContract) external {
        require(msg.sender == owner, "Only owner");
        require(campaignContract == address(0), "Already set");
        campaignContract = _campaignContract;
    }

    /**
     * @notice Deposit ETH into the vault
     */
    function deposit() external payable {
        require(msg.value > 0, "Must deposit more than 0");
        require(msg.value <= type(uint64).max, "Amount too large for uint64");

        euint64 amount = FHE.asEuint64(uint64(msg.value));
        euint64 currentBalance = encryptedBalances[msg.sender];

        if (FHE.isInitialized(currentBalance)) {
            encryptedBalances[msg.sender] = FHE.add(currentBalance, amount);
        } else {
            encryptedBalances[msg.sender] = amount;
        }

        // Grant permissions
        FHE.allowThis(encryptedBalances[msg.sender]);
        FHE.allow(encryptedBalances[msg.sender], msg.sender);
        
        // Only allow campaignContract if it's set
        if (campaignContract != address(0)) {
            FHE.allow(encryptedBalances[msg.sender], campaignContract);
        }

        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Request decryption of available balance (balance - locked)
     */
    function requestAvailableBalanceDecryption() external {
        if (
            availableBalanceStatus[msg.sender] ==
            CommonStruct.DecryptStatus.PROCESSING
        ) {
            revert DecryptAlreadyInProgress();
        }

        euint64 balance = encryptedBalances[msg.sender];
        require(FHE.isInitialized(balance), "No balance");

        // Calculate available balance: balance - locked
        euint64 available;
        euint64 locked = totalLocked[msg.sender];

        if (FHE.isInitialized(locked)) {
            available = FHE.sub(balance, locked);
        } else {
            available = balance;
        }

        // ✅ Allow the contract to read the available balance for decryption
        FHE.allowThis(available);
        
        // Request decryption
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(available);

        uint256 requestId = FHE.requestDecryption(
            handles,
            this.callbackDecryptAvailableBalance.selector
        );

        withdrawalRequests[requestId] = ShareVaultStruct.WithdrawalRequest({
            userAddress: msg.sender
        });

        availableBalanceStatus[msg.sender] = CommonStruct
            .DecryptStatus
            .PROCESSING;

        emit WithdrawalDecryptionRequested(msg.sender, requestId);
    }

    /**
     * @notice Get available balance (must decrypt first)
     */
    function getAvailableBalance() external view returns (uint64) {
        CommonStruct.Uint64ResultWithExp
            memory decryptedWithExp = decryptedAvailableBalance[msg.sender];

        uint64 available = decryptedWithExp.data;
        uint256 expTime = decryptedWithExp.exp;

        // Check if never decrypted
        if (expTime == 0) {
            if (
                availableBalanceStatus[msg.sender] ==
                CommonStruct.DecryptStatus.PROCESSING
            ) {
                revert DecryptionProcessing();
            }
            revert MustDecryptFirst();
        }

        // Check if expired
        if (expTime < block.timestamp) {
            revert DecryptionCacheExpired();
        }

        return available;
    }

    /**
     * @notice Get available balance status
     */
    function getAvailableBalanceStatus()
        external
        view
        returns (
            CommonStruct.DecryptStatus status,
            uint64 availableAmount,
            uint256 cacheExpiry
        )
    {
        status = availableBalanceStatus[msg.sender];
        CommonStruct.Uint64ResultWithExp
            memory decryptedWithExp = decryptedAvailableBalance[msg.sender];

        availableAmount = decryptedWithExp.data;
        cacheExpiry = decryptedWithExp.exp;

        return (status, availableAmount, cacheExpiry);
    }

    /**
     * @notice Withdraw unlocked funds (must decrypt available balance first)
     */
    function withdraw(uint64 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(address(this).balance >= amount, "Insufficient vault balance");

        // Check that user has decrypted their available balance
        CommonStruct.Uint64ResultWithExp
            memory decryptedWithExp = decryptedAvailableBalance[msg.sender];
        uint64 available = decryptedWithExp.data;
        uint256 expTime = decryptedWithExp.exp;

        if (expTime == 0) {
            if (
                availableBalanceStatus[msg.sender] ==
                CommonStruct.DecryptStatus.PROCESSING
            ) {
                revert DecryptionProcessing();
            }
            revert MustDecryptFirst();
        }

        if (expTime < block.timestamp) {
            revert DecryptionCacheExpired();
        }

        // Check if user has enough available balance
        require(available >= amount, "Insufficient available balance");

        euint64 balance = encryptedBalances[msg.sender];
        euint64 withdrawAmount = FHE.asEuint64(amount);

        // Update balance
        encryptedBalances[msg.sender] = FHE.sub(balance, withdrawAmount);

        // Update cached available balance
        decryptedAvailableBalance[msg.sender].data = available - amount;

        // Transfer ETH
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert WithdrawalFailed();

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Lock funds for a campaign (called by campaign contract)
     * @dev This initiates a balance check, actual locking happens in callback
     */
    function lockFunds(
        address user,
        uint16 campaignId,
        euint64 amount
    ) external onlyCampaignContract {
        euint64 balance = encryptedBalances[user];
        euint64 locked = totalLocked[user];

        require(FHE.isInitialized(balance), "User has no balance");

        // Calculate available balance
        euint64 available;
        if (FHE.isInitialized(locked)) {
            available = FHE.sub(balance, locked);
        } else {
            available = balance;
        }

        // Use FHE comparison (returns ebool, not bool)
        ebool hasEnough = FHE.ge(available, amount);
        
        // ✅ Allow the contract to read the comparison result
        FHE.allowThis(hasEnough);

        // Request decryption to check if user has enough
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(hasEnough);

        uint256 requestId = FHE.requestDecryption(
            handles,
            this.callbackCheckSufficientBalance.selector
        );

        pendingLockRequests[requestId] = ShareVaultStruct.LockRequest({
            user: user,
            campaignId: campaignId,
            amount: amount
        });

        emit LockRequestInitiated(user, campaignId, requestId);
    }

    /**
     * @notice Unlock funds (campaign cancelled or failed)
     */
    function unlockFunds(
        address user,
        uint16 campaignId
    ) external onlyCampaignContract {
        euint64 lockedAmount = lockedAmounts[user][campaignId];
        require(FHE.isInitialized(lockedAmount), "No locked amount");

        // Decrease total locked
        totalLocked[user] = FHE.sub(totalLocked[user], lockedAmount);

        // Clear campaign lock
        lockedAmounts[user][campaignId] = FHE.asEuint64(0);

        // Invalidate cached available balance since locked amount changed
        delete decryptedAvailableBalance[user];
        availableBalanceStatus[user] = CommonStruct.DecryptStatus.NONE;

        emit FundsUnlocked(user, campaignId);
    }

    /**
     * @notice Transfer locked funds to campaign owner (campaign succeeded)
     */
    function transferLockedFunds(
        address user,
        address campaignOwner,
        uint16 campaignId
    ) external onlyCampaignContract returns (euint64) {
        euint64 lockedAmount = lockedAmounts[user][campaignId];
        require(FHE.isInitialized(lockedAmount), "No locked amount");

        // Deduct from user's balance
        encryptedBalances[user] = FHE.sub(
            encryptedBalances[user],
            lockedAmount
        );

        // Decrease total locked
        totalLocked[user] = FHE.sub(totalLocked[user], lockedAmount);

        // Add to owner's balance
        euint64 ownerBalance = encryptedBalances[campaignOwner];
        if (FHE.isInitialized(ownerBalance)) {
            encryptedBalances[campaignOwner] = FHE.add(
                ownerBalance,
                lockedAmount
            );
        } else {
            encryptedBalances[campaignOwner] = lockedAmount;
        }

        // Grant permissions
        FHE.allowThis(encryptedBalances[campaignOwner]);
        FHE.allow(encryptedBalances[campaignOwner], campaignOwner);

        // Clear campaign lock
        euint64 returnAmount = lockedAmount;
        lockedAmounts[user][campaignId] = FHE.asEuint64(0);

        // Invalidate cached available balance
        delete decryptedAvailableBalance[user];
        availableBalanceStatus[user] = CommonStruct.DecryptStatus.NONE;

        emit FundsTransferred(user, campaignOwner, campaignId);

        return returnAmount;
    }

    /**
     * @notice Get encrypted balance for user
     */
    function getEncryptedBalance(address user) external view returns (euint64) {
        return encryptedBalances[user];
    }

    /**
     * @notice Get encrypted locked amount for campaign
     */
    function getLockedAmount(
        uint16 campaignId
    ) external view returns (euint64) {
        return lockedAmounts[msg.sender][campaignId];
    }

    /**
     * @notice Get total encrypted locked for user
     */
    function getTotalLocked() external view returns (euint64) {
        return totalLocked[msg.sender];
    }
}