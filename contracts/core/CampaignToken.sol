// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CampaignToken
 * @notice ERC20 token for campaign contributors
 */
contract CampaignToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint16 public immutable campaignId;
    
    constructor(
        string memory name,
        string memory symbol,
        uint16 _campaignId,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {
        campaignId = _campaignId;
    }
    
    /**
     * @notice Mint tokens to contributor (only owner = campaign contract)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }
}