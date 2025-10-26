// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";

library FundraisingStruct {
    struct Campaign {
        address owner;
        string title;
        string description;
        euint64 totalRaised;
        uint64 targetAmount;
        uint256 deadline;
        bool finalized;
        bool cancelled;
        address tokenAddress;
    }

    struct DecryptUserContributionRequest {
        address userAddress;
        uint16 campaignId;
    }
}
