// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../struct/FundraisingStruct.sol";
import "../ShareVault.sol";

abstract contract FundraisingStorage {
    uint256 cacheTimeout = 600; // 10 mins cache

    mapping(uint16 => FundraisingStruct.Campaign) public campaigns;

    mapping(uint16 => mapping(address => bool)) public hasClaimed;

    mapping(uint16 => mapping(address => euint64)) internal encryptedContributions;
    mapping(uint16 => mapping(address => CommonStruct.Uint64ResultWithExp)) internal decryptedContributions;

    mapping(uint16 => CommonStruct.Uint64ResultWithExp) internal decryptedTotalRaised;
    mapping(uint256 => uint16) internal decryptTotalRaisedRequest;
    mapping(uint16 => CommonStruct.DecryptStatus) internal decryptTotalRaisedStatus;

    mapping(uint256 => FundraisingStruct.DecryptUserContributionRequest) internal decryptMyContributionRequest;
    mapping(uint16 => mapping(address => CommonStruct.DecryptStatus)) internal decryptMyContributionStatus;

    uint16 public campaignCount;

    // Mapping to track contributors per campaign
    mapping(uint16 => address[]) internal campaignContributors;
    mapping(uint16 => mapping(address => bool)) internal hasContributed;
    
    // Token claim tracking
    mapping(uint16 => mapping(address => bool)) public hasClaimedTokens;

    ShareVault public immutable shareVault;
}