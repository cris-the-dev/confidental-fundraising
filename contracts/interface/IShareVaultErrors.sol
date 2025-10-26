// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IShareVaultErrors {
    error OnlyCampaignContract();
    error InsufficientBalance();
    error InsufficientUnlockedBalance();
    error WithdrawalFailed();
    error MustDecryptFirst();
    error DecryptionProcessing();
    error DecryptionCacheExpired();
    error DecryptAlreadyInProgress();
    error OnlyOwner();
    error CampaignContractAlreadySet();
    error InvalidDepositAmount();
    error DepositAmountTooLarge();
    error NoBalance();
    error InvalidWithdrawalAmount();
    error InsufficientVaultBalance();
    error InsufficientAvailableBalance();
    error UserHasNoBalance();
    error NoLockedAmount();
}
