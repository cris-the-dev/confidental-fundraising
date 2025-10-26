// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CampaignToken
 * @notice ERC20 token distributed to contributors of successful fundraising campaigns
 * @dev This token is deployed automatically when a campaign reaches its funding target.
 * Contributors receive tokens proportional to their contribution relative to the campaign target.
 * The token has a fixed maximum supply of 1 billion tokens and can only be minted by the
 * ConfidentialFundraising contract (the owner).
 *
 * Token Distribution Formula:
 * userTokens = (userContribution / campaignTarget) * MAX_SUPPLY
 *
 * Key Features:
 * - ERC20 compliant with standard transfer functionality
 * - Fixed maximum supply of 1 billion tokens (with 18 decimals)
 * - Mintable only by the campaign contract owner
 * - Immutable campaign ID reference
 *
 * @custom:security-contact security@example.com
 */
contract CampaignToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint16 public immutable campaignId;

    error ExceedsMaxSupply();

    /**
     * @notice Constructs a new campaign token
     * @dev Called by the ConfidentialFundraising contract when a campaign succeeds.
     * The campaign contract becomes the owner with exclusive minting privileges.
     * @param name The token name (chosen by campaign owner)
     * @param symbol The token symbol (chosen by campaign owner)
     * @param _campaignId The ID of the associated campaign
     * @param initialOwner The address that will own this token (the campaign contract)
     */
    constructor(
        string memory name,
        string memory symbol,
        uint16 _campaignId,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {
        campaignId = _campaignId;
    }
    
    /**
     * @notice Mints tokens to a campaign contributor
     * @dev Can only be called by the owner (ConfidentialFundraising contract).
     * Called when a contributor claims their tokens after a successful campaign.
     * The total supply across all mints cannot exceed MAX_SUPPLY.
     * @param to The address of the contributor receiving tokens
     * @param amount The amount of tokens to mint (with 18 decimals)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        if (totalSupply() + amount > MAX_SUPPLY) {
            revert ExceedsMaxSupply();
        }
        _mint(to, amount);
    }
}