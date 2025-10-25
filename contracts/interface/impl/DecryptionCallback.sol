// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import "../IDecryptionCallbacks.sol";
import "../../core/EncryptedHelper.sol";
import "../../storage/FundraisingStorage.sol";
import "../../storage/ShareVaultStorage.sol";
import "../../struct/CommonStruct.sol";
import "../../struct/FundraisingStruct.sol";
import "../../struct/ShareVaultStruct.sol";

contract DecryptionCallbacks is IDecryptionCallbacks, FundraisingStorage, ShareVaultStorage {

    function callbackDecryptMyContribution(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external override {
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        uint64 contributedAmount = EncryptedHelper.decodeUserContribution(
            cleartexts
        );
        FundraisingStruct.DecryptUserContributionRequest memory request = decryptMyContributionRequest[requestId];
        decryptedContributions[request.campaignId][request.userAddress] = CommonStruct.Uint64ResultWithExp({
            data: contributedAmount,
            exp: block.timestamp + cacheTimeout
        });

        delete decryptMyContributionRequest[requestId];

        decryptMyContributionStatus[request.campaignId][
            request.userAddress
        ] = CommonStruct.DecryptStatus.DECRYPTED;
    }

    function callbackDecryptTotalRaised(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external override {
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        uint16 campaignId = decryptTotalRaisedRequest[requestId];

        uint64 totalRaised = EncryptedHelper.decodeTotalRaised(
            cleartexts
        );
        decryptedTotalRaised[campaignId] = CommonStruct.Uint64ResultWithExp({
            data: totalRaised,
            exp: block.timestamp + cacheTimeout
        });

        delete decryptTotalRaisedRequest[requestId];
        decryptTotalRaisedStatus[campaignId] = CommonStruct.DecryptStatus.DECRYPTED;
    }

    function callbackDecryptAvailableBalance(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external override {
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        uint64 availableAmount = EncryptedHelper.decodeAvailableBalance(cleartexts);

        ShareVaultStruct.WithdrawalRequest memory request = withdrawalRequests[
            requestId
        ];

        decryptedAvailableBalance[request.userAddress] = CommonStruct
            .Uint64ResultWithExp({
                data: availableAmount,
                exp: block.timestamp + CACHE_TIMEOUT
            });

        delete withdrawalRequests[requestId];

        availableBalanceStatus[request.userAddress] = CommonStruct
            .DecryptStatus
            .DECRYPTED;
    }

    /**
     * @notice Callback to verify sufficient balance and complete locking
     * ✅ Using assembly decoding for bool
     */
    function callbackCheckSufficientBalance(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external override {
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        // ✅ Use assembly decoding (same as your ConfidentialFundraising)
        bool hasEnough = EncryptedHelper.decodeBool(cleartexts);

        require(hasEnough, "Insufficient available balance");

        ShareVaultStruct.LockRequest memory lockRequest = pendingLockRequests[
            requestId
        ];

        // Now actually lock the funds
        euint64 existingLock = lockedAmounts[lockRequest.user][
            lockRequest.campaignId
        ];
        if (FHE.isInitialized(existingLock)) {
            lockedAmounts[lockRequest.user][lockRequest.campaignId] = FHE.add(
                existingLock,
                lockRequest.amount
            );
        } else {
            lockedAmounts[lockRequest.user][
                lockRequest.campaignId
            ] = lockRequest.amount;
        }

        // Update total locked
        euint64 locked = totalLocked[lockRequest.user];
        if (FHE.isInitialized(locked)) {
            totalLocked[lockRequest.user] = FHE.add(locked, lockRequest.amount);
        } else {
            totalLocked[lockRequest.user] = lockRequest.amount;
        }

        // Grant permissions
        FHE.allowThis(lockedAmounts[lockRequest.user][lockRequest.campaignId]);
        FHE.allow(
            lockedAmounts[lockRequest.user][lockRequest.campaignId],
            campaignContract
        );
        FHE.allowThis(totalLocked[lockRequest.user]);

        // Invalidate cached available balance since locked amount changed
        delete decryptedAvailableBalance[lockRequest.user];
        availableBalanceStatus[lockRequest.user] = CommonStruct
            .DecryptStatus
            .NONE;

        delete pendingLockRequests[requestId];
    }
}