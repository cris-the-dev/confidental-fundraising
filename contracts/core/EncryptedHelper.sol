// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library EncryptedHelper {
    function decodeUserContribution(
        bytes memory cleartexts
    ) internal pure returns (uint64 contributedAmount) {
        assembly {
            let dataPtr := add(cleartexts, 0x20)
            contributedAmount := mload(dataPtr)
        }

        return (contributedAmount);
    }

    function decodeTotalRaised(
        bytes memory cleartexts
    ) internal pure returns (uint64 totalRaised) {
        assembly {
            let dataPtr := add(cleartexts, 0x20)
            totalRaised := mload(dataPtr)
        }

        return (totalRaised);
    }

    function decodeBool(
        bytes memory cleartexts
    ) internal pure returns (bool value) {
        assembly {
            let dataPtr := add(cleartexts, 0x20)
            let rawValue := mload(dataPtr)
            value := gt(rawValue, 0)
        }
        return value;
    }

    /**
     * @notice Decode uint64 from cleartext
     */
    function decodeUint64(
        bytes memory cleartexts
    ) internal pure returns (uint64 value) {
        assembly {
            let dataPtr := add(cleartexts, 0x20)
            value := mload(dataPtr)
        }
        return value;
    }
}
