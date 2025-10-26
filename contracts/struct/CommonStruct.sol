// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";

library CommonStruct {
    enum DecryptStatus {
        NONE,
        PROCESSING,
        DECRYPTED
    }

    struct Uint64ResultWithExp {
        uint64 data;
        uint256 exp;
    }
}
