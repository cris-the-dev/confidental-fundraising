// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../struct/ShareVaultStruct.sol";
import "../struct/CommonStruct.sol";

abstract contract ShareVaultStorage {
    // User balances (encrypted)
    mapping(address => euint64) internal encryptedBalances;

    // Locked amounts per user per campaign (encrypted)
    mapping(address => mapping(uint16 => euint64)) internal lockedAmounts;

    // Total locked per user (encrypted)
    mapping(address => euint64) internal totalLocked;

    // Decryption status and cached available balance
    mapping(address => CommonStruct.DecryptStatus)
        internal availableBalanceStatus;
    mapping(address => CommonStruct.Uint64ResultWithExp)
        internal decryptedAvailableBalance;
    mapping(uint256 => ShareVaultStruct.WithdrawalRequest)
        internal withdrawalRequests;

    // Pending lock requests waiting for balance check
    mapping(uint256 => ShareVaultStruct.LockRequest)
        internal pendingLockRequests;

    // Campaign contract address (authorized to lock/unlock)
    address public campaignContract;

    // Cache timeout (10 minutes)
    uint256 public constant CACHE_TIMEOUT = 600;
}