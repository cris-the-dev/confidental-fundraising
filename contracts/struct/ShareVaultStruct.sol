// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";

library ShareVaultStruct {
    struct WithdrawalRequest {
        address userAddress;
    }
    
    struct LockRequest {
        address user;
        uint16 campaignId;
        euint64 amount;
    }
}
