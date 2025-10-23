// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library EncryptedHelper {
    function decodeUserContribution(
        bytes memory cleartexts
    ) internal pure returns (uint8 contributedAmount) {
        assembly {
            let dataPtr := add(cleartexts, 0x08)
            contributedAmount := mload(dataPtr)
        }

        return (contributedAmount);
    }

    function decodeTotalRaised(
        bytes memory cleartexts
    ) internal pure returns (uint8 totalRaised) {
        assembly {
            let dataPtr := add(cleartexts, 0x08)
            totalRaised := mload(dataPtr)
        }

        return (totalRaised);
    }
}
