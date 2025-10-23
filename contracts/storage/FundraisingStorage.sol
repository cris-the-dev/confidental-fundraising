// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../core/FundraisingStruct.sol";

abstract contract FundraisingStorage {
    mapping(uint16 => FundraisingStruct.Campaign) public campaigns;

    mapping(uint16 => mapping(address => bool)) public hasClaimed;

    mapping(uint16 => mapping(address => euint8)) internal encryptedContributions;
    mapping(uint16 => mapping(address => uint8)) internal decryptedContributions;

    mapping(uint16 => uint8) internal decryptedTotalRaised;
    mapping(uint256 => uint16) internal decryptTotalRaisedRequest;
    mapping(uint16 => FundraisingStruct.DecryptStatus) internal decryptTotalRaisedStatus;

    mapping(uint256 => FundraisingStruct.DecryptUserContributionRequest) internal decryptMyContributionRequest;
    mapping(uint16 => mapping(address => FundraisingStruct.DecryptStatus)) internal decryptMyContributionStatus;

    uint16 public campaignCount;
}