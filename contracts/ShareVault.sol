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
 * @author cristhedev (https://github.com/cris-the-dev)
 * @notice Secure vault for managing encrypted user balances and campaign fund locks
 * @dev This contract acts as a decentralized escrow system for the ConfidentialFundraising platform.
 * It manages encrypted ETH balances, handles fund locking for active campaigns, and enables
 * privacy-preserving withdrawals through FHE-based balance verification.
 *
 * Key Features:
 * - Encrypted balance tracking for all users
 * - Campaign-specific fund locking mechanism
 * - Decryption-based withdrawal authorization
 * - Automatic balance permission management
 * - Support for multiple simultaneous campaign locks per user
 *
 * Security Model:
 * - Only the authorized campaign contract can lock/unlock/transfer funds
 * - Users must decrypt their available balance before withdrawal
 * - All encrypted operations use FHEVM for on-chain privacy
 *
 * @custom:security-contact tiennln.work@gmail.com
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

    /**
     * @notice Sets the authorized campaign contract address
     * @dev Can only be called once by the owner during initial setup. This address
     * will have exclusive permission to lock, unlock, and transfer user funds.
     * @param _campaignContract The address of the ConfidentialFundraising contract
     */
    function setCampaignContract(address _campaignContract) external {
        if (msg.sender != owner) {
            revert OnlyOwner();
        }
        if (campaignContract != address(0)) {
            revert CampaignContractAlreadySet();
        }
        campaignContract = _campaignContract;
    }

    /**
     * @notice Deposits ETH into the vault as an encrypted balance
     * @dev The deposited amount is encrypted on-chain and added to the user's balance.
     * Resets any cached decrypted balance values. Grants necessary FHE permissions
     * to the user and campaign contract.
     * @custom:emits Deposited
     */
    function deposit() external payable {
        if (msg.value == 0) {
            revert InvalidDepositAmount();
        }
        if (msg.value > type(uint64).max) {
            revert DepositAmountTooLarge();
        }

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

        // Reset cache
        decryptedAvailableBalance[msg.sender].data = 0;
        decryptedAvailableBalance[msg.sender].exp = 0;
        availableBalanceStatus[msg.sender] = CommonStruct.DecryptStatus.NONE;

        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Requests decryption of the user's available balance
     * @dev Calculates available balance as (total balance - total locked) and initiates
     * an asynchronous decryption request. The result will be cached after the callback.
     * Use getAvailableBalance() to retrieve the decrypted value.
     * @custom:emits WithdrawalDecryptionRequested
     */
    function requestAvailableBalanceDecryption() external {
        if (
            availableBalanceStatus[msg.sender] ==
            CommonStruct.DecryptStatus.PROCESSING
        ) {
            revert DecryptAlreadyInProgress();
        }

        euint64 balance = encryptedBalances[msg.sender];
        if (!FHE.isInitialized(balance)) {
            revert NoBalance();
        }

        // Calculate available balance: balance - locked
        euint64 available;
        euint64 locked = totalLocked[msg.sender];

        if (FHE.isInitialized(locked)) {
            available = FHE.sub(balance, locked);
        } else {
            available = balance;
        }

        // Allow the contract to read the available balance for decryption
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
     * @notice Retrieves the user's decrypted available balance
     * @dev The balance must be decrypted first by calling requestAvailableBalanceDecryption().
     * Returns the cached decrypted value if not expired.
     * @return The available balance in wei (total balance minus locked amounts)
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
     * @notice Retrieves the decryption status and cached available balance
     * @dev Useful for checking if decryption is in progress or if cache is expired
     * @return status The current decryption status (NONE/PROCESSING/DECRYPTED)
     * @return availableAmount The cached available balance (0 if not decrypted)
     * @return cacheExpiry The timestamp when the cached value expires
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
     * @notice Withdraws unlocked funds from the vault
     * @dev Users must first decrypt their available balance. The decryption acts as
     * authorization proof for the withdrawal. Resets the cached balance after withdrawal.
     * @param amount The amount to withdraw in wei
     * @custom:emits Withdrawn
     */
    function withdraw(uint64 amount) external {
        if (amount == 0) {
            revert InvalidWithdrawalAmount();
        }
        if (address(this).balance < amount) {
            revert InsufficientVaultBalance();
        }

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
        if (available < amount) {
            revert InsufficientAvailableBalance();
        }

        euint64 balance = encryptedBalances[msg.sender];
        euint64 withdrawAmount = FHE.asEuint64(amount);

        // Update balance
        encryptedBalances[msg.sender] = FHE.sub(balance, withdrawAmount);

        FHE.allowThis(encryptedBalances[msg.sender]);
        FHE.allow(encryptedBalances[msg.sender], msg.sender);

        // Only allow campaignContract if it's set
        if (campaignContract != address(0)) {
            FHE.allow(encryptedBalances[msg.sender], campaignContract);
        }

        // Reset cache
        decryptedAvailableBalance[msg.sender].data = 0;
        decryptedAvailableBalance[msg.sender].exp = 0;
        availableBalanceStatus[msg.sender] = CommonStruct.DecryptStatus.NONE;

        // Transfer ETH
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert WithdrawalFailed();

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Locks encrypted funds for a specific campaign
     * @dev Called exclusively by the campaign contract when a user contributes.
     * Operates entirely on encrypted values using FHE. If insufficient funds are available,
     * safely locks 0 instead of reverting. Invalidates cached available balance.
     * @param user The address of the contributor
     * @param campaignId The ID of the campaign
     * @param amount The encrypted amount to lock
     * @custom:emits FundsLocked
     */
    function lockFunds(
        address user,
        uint16 campaignId,
        euint64 amount
    ) external onlyCampaignContract {
        euint64 balance = encryptedBalances[user];

        if (!FHE.isInitialized(balance)) {
            revert UserHasNoBalance();
        }

        // Calculate available balance: balance - totalLocked
        euint64 available;
        euint64 locked = totalLocked[user];

        if (FHE.isInitialized(locked)) {
            available = FHE.sub(balance, locked);
        } else {
            available = balance;
        }

        FHE.allowThis(available);

        ebool sufficientFunds = FHE.ge(available, amount);
        FHE.allowThis(sufficientFunds);

        // If insufficient funds, lock 0; otherwise lock the requested amount
        euint64 safeAmount = FHE.select(
            sufficientFunds,
            amount,
            FHE.asEuint64(0)
        );

        FHE.allowThis(safeAmount);

        // Actually lock the funds
        euint64 existingLock = lockedAmounts[user][campaignId];
        if (FHE.isInitialized(existingLock)) {
            lockedAmounts[user][campaignId] = FHE.add(existingLock, safeAmount);
        } else {
            lockedAmounts[user][campaignId] = safeAmount;
        }

        // Update total locked
        if (FHE.isInitialized(locked)) {
            totalLocked[user] = FHE.add(locked, safeAmount);
        } else {
            totalLocked[user] = safeAmount;
        }

        // Grant permissions
        FHE.allowThis(lockedAmounts[user][campaignId]);
        FHE.allow(lockedAmounts[user][campaignId], campaignContract);
        FHE.allow(lockedAmounts[user][campaignId], user);


        FHE.allowThis(totalLocked[user]);
        FHE.allow(totalLocked[user], campaignContract);
        FHE.allow(totalLocked[user], user);

        // Invalidate cached available balance since locked amount changed
        delete decryptedAvailableBalance[user];
        availableBalanceStatus[user] = CommonStruct.DecryptStatus.NONE;

        emit FundsLocked(user, campaignId);
    }

    /**
     * @notice Unlocks funds previously locked for a campaign
     * @dev Called by the campaign contract when a campaign is cancelled or fails to reach
     * its target. Returns funds to the user's available balance without transferring ETH.
     * @param user The address of the contributor
     * @param campaignId The ID of the campaign
     * @custom:emits FundsUnlocked
     */
    function unlockFunds(
        address user,
        uint16 campaignId
    ) external onlyCampaignContract {
        euint64 lockedAmount = lockedAmounts[user][campaignId];
        if (!FHE.isInitialized(lockedAmount)) {
            revert NoLockedAmount();
        }

        // Decrease total locked
        totalLocked[user] = FHE.sub(totalLocked[user], lockedAmount);

        FHE.allowThis(totalLocked[user]);
        FHE.allow(totalLocked[user], user);
        FHE.allow(totalLocked[user], campaignContract);

        // Clear campaign lock
        lockedAmounts[user][campaignId] = FHE.asEuint64(0);

        FHE.allowThis(lockedAmounts[user][campaignId]);
        FHE.allow(lockedAmounts[user][campaignId], user);
        FHE.allow(lockedAmounts[user][campaignId], campaignContract);

        // Invalidate cached available balance since locked amount changed
        delete decryptedAvailableBalance[user];
        availableBalanceStatus[user] = CommonStruct.DecryptStatus.NONE;

        emit FundsUnlocked(user, campaignId);
    }

    /**
     * @notice Transfers locked funds from contributor to campaign owner
     * @dev Called by the campaign contract when a campaign succeeds. Moves encrypted funds
     * from the contributor's balance to the campaign owner's balance within the vault.
     * Does not transfer actual ETH - funds remain in the vault.
     * @param user The address of the contributor
     * @param campaignOwner The address of the campaign owner
     * @param campaignId The ID of the successful campaign
     * @return The encrypted locked amount that was transferred
     * @custom:emits FundsTransferred
     */
    function transferLockedFunds(
        address user,
        address campaignOwner,
        uint16 campaignId
    ) external onlyCampaignContract returns (euint64) {
        euint64 lockedAmount = lockedAmounts[user][campaignId];
        if (!FHE.isInitialized(lockedAmount)) {
            revert NoLockedAmount();
        }

        // Deduct from user's balance
        encryptedBalances[user] = FHE.sub(
            encryptedBalances[user],
            lockedAmount
        );

        FHE.allowThis(encryptedBalances[user]);
        FHE.allow(encryptedBalances[user], user);
        FHE.allow(encryptedBalances[user], campaignContract);

        // Decrease total locked
        totalLocked[user] = FHE.sub(totalLocked[user], lockedAmount);

        FHE.allowThis(totalLocked[user]);
        FHE.allow(totalLocked[user], user);
        FHE.allow(totalLocked[user], campaignContract);

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
        FHE.allow(encryptedBalances[campaignOwner], campaignContract);

        // Clear campaign lock
        euint64 returnAmount = lockedAmount;
        lockedAmounts[user][campaignId] = FHE.asEuint64(0);

        FHE.allowThis(lockedAmounts[user][campaignId]);
        FHE.allow(lockedAmounts[user][campaignId], user);
        FHE.allow(lockedAmounts[user][campaignId], campaignContract);

        // Invalidate cached available balance
        delete decryptedAvailableBalance[user];
        availableBalanceStatus[user] = CommonStruct.DecryptStatus.NONE;

        emit FundsTransferred(user, campaignOwner, campaignId);

        return returnAmount;
    }

    /**
     * @notice Gets the encrypted balance and locked amount for a user
     * @dev For user-side decryption. Returns both values so client can calculate available (balance - locked).
     * User must have been granted FHE permissions.
     * @return balance The encrypted total balance
     * @return locked The encrypted total locked amount
     */
    function getEncryptedBalanceAndLocked() external view returns (euint64 balance, euint64 locked) {
        return (encryptedBalances[msg.sender], totalLocked[msg.sender]);
    }

    /**
     * @notice Gets the encrypted total balance for a user
     * @dev For user-side decryption. User must have been granted FHE permissions.
     * @return The encrypted total balance
     */
    function getEncryptedBalance() external view returns (euint64) {
        return encryptedBalances[msg.sender];
    }

    /**
     * @notice Gets the encrypted total locked amount for a user
     * @dev For user-side decryption. User must have been granted FHE permissions.
     * @return The encrypted total locked amount
     */
    function getEncryptedTotalLocked() external view returns (euint64) {
        return totalLocked[msg.sender];
    }
}
