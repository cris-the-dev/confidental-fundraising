// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IFundraisingErrors {
    error DataProcessing();
    error ContributionNotFound();
    error CampaignNotExist();
    error CampaignEnded();
    error AlreadyCancelled();
    error OnlyOwner();
    error CampaignStillActive();
    error AlreadyFinalized();
    error CampaignNotFinalized();
    error AlreadyClaimed();
    error UnauthorizedAccess();
    error TotalRaisedNotDecrypted();
    error MyContributionNotDecrypted();
    error CacheExpired();
}
