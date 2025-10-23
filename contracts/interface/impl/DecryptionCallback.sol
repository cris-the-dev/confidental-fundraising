// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import "../IDecryptionCallbacks.sol";
import "../../core/EncryptedHelper.sol";
import "../../core/FundraisingStruct.sol";
import "../../storage/FundraisingStorage.sol";

contract DecryptionCallbacks is IDecryptionCallbacks, FundraisingStorage {

    function callbackDecryptMyContribution(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external override {
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        uint8 contributedAmount = EncryptedHelper.decodeUserContribution(
            cleartexts
        );
        FundraisingStruct.DecryptUserContributionRequest memory request = decryptMyContributionRequest[requestId];
        decryptedContributions[request.campaignId][request.userAddress] = FundraisingStruct.Uint8ResultWithExp({
            data: contributedAmount,
            exp: block.timestamp + cacheTimeout
        });

        delete decryptMyContributionRequest[requestId];

        decryptMyContributionStatus[request.campaignId][
            msg.sender
        ] = FundraisingStruct.DecryptStatus.DECRYPTED;
    }

    function callbackDecryptTotalRaised(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external override {
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        uint16 campaignId = decryptTotalRaisedRequest[requestId];

        uint8 totalRaised = EncryptedHelper.decodeTotalRaised(
            cleartexts
        );
        decryptedTotalRaised[campaignId] = FundraisingStruct.Uint8ResultWithExp({
            data: totalRaised,
            exp: block.timestamp + cacheTimeout
        });

        delete decryptTotalRaisedRequest[requestId];
        decryptTotalRaisedStatus[campaignId] = FundraisingStruct.DecryptStatus.DECRYPTED;
    }
}