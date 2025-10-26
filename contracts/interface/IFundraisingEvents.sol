// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IFundraisingEvents {
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed owner,
        string title,
        uint256 targetAmount,
        uint256 deadline
    );
    event ContributionMade(
        uint256 indexed campaignId,
        address indexed contributor
    );
    event CampaignFinalized(uint256 indexed campaignId, bool targetReached);
    event CampaignCancelled(uint256 indexed campaignId);
    event TokensClaimed(
        uint256 indexed campaignId,
        address indexed contributor
    );
    event TokensDistributed(
        uint16 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );
    event CampaignFailed(uint16 indexed campaignId);
}
