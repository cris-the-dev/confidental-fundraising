// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IShareVaultEvents {
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event FundsLocked(address indexed user, uint16 indexed campaignId);
    event FundsUnlocked(address indexed user, uint16 indexed campaignId);
    event FundsTransferred(
        address indexed from,
        address indexed to,
        uint16 indexed campaignId
    );
    event WithdrawalDecryptionRequested(
        address indexed user,
        uint256 requestId
    );
    event AvailableBalanceDecrypted(address indexed user, uint64 amount);
    event LockRequestInitiated(
        address indexed user,
        uint16 indexed campaignId,
        uint256 requestId
    );
}
