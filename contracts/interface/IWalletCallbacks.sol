// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IWalletCallbacks {
    function callbackDecryptAvailableBalance(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external;
    
    function callbackCheckSufficientBalance(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external;
}