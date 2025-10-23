// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import "../IDecryptionCallbacks.sol";
import "../../core/EncryptedHelper.sol";
import "../../core/FundraisingStruct.sol";
import "../../storage/FundraisingStorage.sol";

contract DecryptionCallbacks is IDecryptionCallbacks, FundraisingStorage  {
    using FHE for euint64;

    function callbackDecryptMyContribution(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external override {
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        (uint8 contributedAmount) = EncryptedHelper.decodeUserContribution(cleartexts);
        FundraisingStruct.DecryptUserContributionRequest memory request = decryptMyContributionRequest[requestId];
        decryptedContributions[request.campaignId][request.userAddress] = contributedAmount;

        delete decryptMyContributionRequest[requestId];

        decryptMyContributionStatus[request.campaignId][msg.sender] = FundraisingStruct.DecryptStatus.DECRYPTED;
    }
}