# 🔐 Confidential Fundraising Platform

A privacy-preserving decentralized fundraising platform built with **FHEVM (Fully Homomorphic Encryption Virtual Machine)**. Contributors can support campaigns while keeping their contribution amounts completely private, with only authorized parties able to decrypt sensitive information.

Author: [@cris_thedev](https://x.com/cris_thedev)
---

| Contract Name | Network | Contract Address
|----------|-------------|--------|
| ConfidentialFundraising | Sepolia | [`0x203db914535Dd91A10cC934FC813C847d25B488e`](https://sepolia.etherscan.io/address/0x203db914535Dd91A10cC934FC813C847d25B488e) |
| ShareVault | Sepolia | [`0xC99D0fF63B8b86F227F08F37b40a563Ccc23c65b`](https://sepolia.etherscan.io/address/0xC99D0fF63B8b86F227F08F37b40a563Ccc23c65b) |
---
Demo Video: [Loom demo video](https://www.loom.com/share/79e14fa3ebcf46188041079983966130)
---

## 📖 Concept

The Confidential Fundraising Platform revolutionizes crowdfunding by combining blockchain transparency with **cryptographic privacy**. Traditional fundraising platforms expose all contribution amounts publicly, which can influence donor behavior and compromise privacy. My solution leverages **homomorphic encryption** to keep contribution amounts encrypted on-chain while still enabling mathematical operations like summing total contributions.

### Key Features

- **🔒 Private Contributions**: All contribution amounts are encrypted using FHEVM technology
- **🎯 Goal-Based Campaigns**: Campaigns have targets and deadlines
- **🪙 Token Rewards**: Successful campaigns distribute ERC20 tokens proportionally to contributors
- **💰 Automatic Refunds**: Failed campaigns automatically refund contributors
- **🔐 Secure Escrow**: ShareVault contract manages all funds with encrypted balance tracking
- **⚡ Client-Side Decryption**: Instant decryption without waiting for blockchain callbacks
- **🎭 Zero-Knowledge**: Campaign totals remain private until authorized decryption

---

## 🏗️ Architecture Overview

The platform consists of three main layers: **Smart Contracts** (on-chain logic), **Frontend Application** (user interface), and **FHEVM Layer** (encryption/decryption).

<img src="diagrams/png/architecture-overview.png" alt="Architecture Overview" width="80%">

### Smart Contract Architecture

<img src="diagrams/png/smart-contract-architecture.png" alt="Smart Contract Architecture" width="80%">

---

## 🔄 Application Flows

### 1. Campaign Creation Flow

<img src="diagrams/png/campaign-creation.png" alt="Campaign Creation Flow" width="80%">

### 2. Contribution Flow

<img src="diagrams/png/contribute.png" alt="Contribution Flow" width="80%">

### 3. Campaign Finalization Flow

<img src="diagrams/png/campaign-finalization.png" alt="Campaign Finalization Flow" width="80%">

### 4. Token Claim Flow

<img src="diagrams/png/token-claim.png" alt="Token Claim Flow" width="80%">

### 5. Vault Balance & Withdrawal Flow

<img src="diagrams/png/vault-balance-withdrawal.png" alt="Vault Balance & Withdrawal Flow" width="80%">

### 6. Encryption & Decryption Flow (Technical)

```mermaid
---
config:
  look: handDrawn
  theme: neutral
---

graph LR
    subgraph "📤 Encryption Process"
        A[Plain Value<br/>e.g., 100 ETH] --> B[FHEVM SDK<br/>Encrypt]
        B --> C[Encrypted Value<br/>euint64]
        B --> D[Proof<br/>ZK Proof]
        C --> E[Smart Contract]
        D --> E
    end

    subgraph "📥 Decryption Process"
        F[Smart Contract] --> G[getEncrypted...<br/>Read Function]
        G --> H[Encrypted Value]
        H --> I[FHEVM SDK<br/>Client-Side Decrypt]
        I --> J[Verify Permissions]
        J --> K[Plain Value<br/>100 ETH]
    end

    E -.Stored On-Chain.-> F

    style A fill:#ffcccc,stroke:#333,stroke-width:2px
    style K fill:#ccffcc,stroke:#333,stroke-width:2px
    style E fill:#cce5ff,stroke:#333,stroke-width:2px
    style F fill:#cce5ff,stroke:#333,stroke-width:2px
    style I fill:#ffd700,stroke:#333,stroke-width:3px
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | >= 20.0.0 | Runtime environment |
| **npm** or **yarn** | Latest | Package manager |
| **Git** | Latest | Version control |
| **MetaMask** or compatible wallet | Latest | Web3 wallet |
| **Hardhat** | ^2.22.15 | Smart contract development |
| **TypeScript** | >= 5.0.0 | Type safety |

### Technology Stack

#### Smart Contracts
- **Solidity**: 0.8.24
- **FHEVM Core Contracts**: ^0.8.0
- **FHEVM Solidity Library**: ^0.8.0
- **Zama Oracle SDK**: ^0.2.0
- **Hardhat**: Development environment
- **TypeChain**: Type-safe contract interactions
- **Ethers v6**: Web3 library

#### Frontend
- **Next.js**: 15.0.0 (App Router)
- **React**: 19.1.0
- **TypeScript**: ^5.0.0
- **Viem**: ^2.21.53 (Ethereum client)
- **Ethers**: ^6.13.4 (Provider/Signer)
- **Privy**: ^3.0.1 (Wallet authentication)
- **Zama FHEVM Relayer SDK**: ^0.2.0 (Encryption/Decryption)
- **Tailwind CSS**: ^3.4.17 (Styling)

### Installation

#### 1. Clone the Repository

```bash
git clone git@github.com:cris-the-dev/confidential-fundraising.git
cd confidential-fundraising
```

#### 2. Install Contract Dependencies

```bash
npm install
```

#### 3. Install Frontend Dependencies

```bash
cd fundraising-frontend
npm install
```

#### 4. Configure Environment Variables

**Root `.env` file** (for contract deployment):
```bash
# Create .env file in root directory
cp .env.example .env

# Add your configuration
PRIVATE_KEY=your_wallet_private_key
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
ETHERSCAN_API_KEY=your_etherscan_api_key
```

**Frontend `.env.local` file**:
```bash
# Create .env.local in fundraising-frontend/
cd fundraising-frontend
cp .env.example .env.local

# Add your configuration
NEXT_PUBLIC_CONTRACT_ADDRESS=0x... # ConfidentialFundraising contract
NEXT_PUBLIC_VAULT_ADDRESS=0x...    # ShareVault contract
NEXT_PUBLIC_CHAIN_ID=11155111      # Sepolia testnet
NEXT_PUBLIC_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
```

### Development Workflow

#### Local Development with Mock FHEVM

```bash
# Terminal 1: Start local Hardhat node
npm run node

# Terminal 2: Deploy contracts to localhost
npm run deploy:localhost

# Terminal 3: Start frontend
cd fundraising-frontend
npm run dev
```

Visit `http://localhost:3000` to see the application.

#### Testing Contracts

```bash
# Run all tests
npm test

# Run tests with coverage
npm run coverage:mock

# Run specific test file
npx hardhat test test/ConfidentialFundraising.test.ts
```

#### Compile Contracts

```bash
npm run compile
```

This generates:
- Compiled artifacts in `artifacts/`
- TypeChain types in `types/`
- ABI files for frontend integration

### Deployment

#### Deploy to Sepolia Testnet

```bash
# Ensure .env is configured with PRIVATE_KEY and SEPOLIA_RPC_URL
npm run deploy:sepolia

# Verify contracts on Etherscan
npm run verify:sepolia
```

The deployment script will output contract addresses:
```
✅ ShareVault deployed to: 0x...
✅ ConfidentialFundraising deployed to: 0x...
```

Update these addresses in `fundraising-frontend/.env.local`.

#### Production Build

```bash
cd fundraising-frontend
npm run build
npm start
```

---

## 📋 Deployed Contracts Detail

### Contract Addresses (Sepolia Testnet)

Update these values in your `.env.local` file after deployment:

```
NEXT_PUBLIC_CONTRACT_ADDRESS=<ConfidentialFundraising-address>
NEXT_PUBLIC_VAULT_ADDRESS=<ShareVault-address>
NEXT_PUBLIC_CHAIN_ID=11155111
```

### Contract Specifications

#### 1. ConfidentialFundraising.sol

**Address**: Set in `NEXT_PUBLIC_CONTRACT_ADDRESS`

**Purpose**: Main fundraising campaign management contract

**Key Functions**:
| Function | Parameters | Description | Access |
|----------|-----------|-------------|--------|
| `createCampaign` | `title`, `description`, `target`, `duration` | Creates new campaign | Public |
| `contribute` | `campaignId`, `encryptedAmount`, `proof` | Contribute to campaign | Public |
| `finalizeCampaign` | `campaignId`, `tokenName`, `tokenSymbol` | Finalize after deadline | Owner only |
| `claimTokens` | `campaignId` | Claim reward tokens | Contributors |
| `getEncryptedContribution` | `campaignId`, `user` | Get encrypted contribution | Public (read) |
| `getEncryptedTotalRaised` | `campaignId` | Get encrypted campaign total | Public (read) |

**Events**:
- `CampaignCreated(uint256 campaignId, address owner, string title, uint256 target)`
- `ContributionMade(uint256 campaignId, address contributor)`
- `CampaignFinalized(uint256 campaignId, bool successful, address tokenAddress)`
- `TokensClaimed(uint256 campaignId, address contributor, uint256 amount)`
- `CampaignFailed(uint256 campaignId)`

**Storage**:
- `Campaign[] public campaigns` - Array of all campaigns
- `mapping(uint256 => mapping(address => euint64)) contributions` - Encrypted contributions
- `mapping(uint256 => euint64) totalRaised` - Encrypted campaign totals

#### 2. ShareVault.sol

**Address**: Set in `NEXT_PUBLIC_VAULT_ADDRESS`

**Purpose**: Secure escrow managing encrypted user balances and campaign locks

**Key Functions**:
| Function | Parameters | Description | Access |
|----------|-----------|-------------|--------|
| `deposit` | - (payable) | Deposit ETH into vault | Public |
| `withdraw` | `amount` | Withdraw available balance | Public |
| `lockFunds` | `user`, `campaignId`, `encryptedAmount` | Lock funds for campaign | Campaign contract |
| `transferLockedFunds` | `recipient`, `campaignId` | Transfer locked funds | Campaign contract |
| `unlockFunds` | `campaignId` | Unlock funds (refund) | Campaign contract |
| `getEncryptedBalance` | `user` | Get encrypted balance | Public (read) |
| `getEncryptedBalanceAndLocked` | `user` | Get balance + total locked | Public (read) |
| `getEncryptedTotalLocked` | `user` | Get total locked amount | Public (read) |

**Events**:
- `Deposited(address user, uint256 amount)`
- `Withdrawn(address user, uint256 amount)`
- `FundsLocked(address user, uint256 campaignId, uint256 amount)`
- `FundsTransferred(address recipient, uint256 campaignId, uint256 amount)`
- `FundsUnlocked(uint256 campaignId, address user, uint256 amount)`

**Storage**:
- `mapping(address => euint64) private balances` - Encrypted user balances
- `mapping(address => mapping(uint256 => euint64)) private lockedAmounts` - Per-campaign locks
- `mapping(address => uint256) private totalLocked` - Total locked per user

#### 3. CampaignToken.sol (ERC20)

**Address**: Deployed dynamically per campaign

**Purpose**: Campaign-specific reward tokens for successful campaigns

**Specifications**:
- **Standard**: ERC20
- **Max Supply**: 1,000,000,000 (1 billion tokens)
- **Decimals**: 18
- **Distribution**: Proportional to contribution amount
- **Formula**: `userTokens = (userContribution / campaignTarget) × MAX_SUPPLY`

**Key Functions**:
| Function | Parameters | Description | Access |
|----------|-----------|-------------|--------|
| `mint` | `to`, `amount` | Mint tokens to address | Owner only (ConfidentialFundraising) |
| `balanceOf` | `account` | Get token balance | Public (read) |
| `transfer` | `to`, `amount` | Transfer tokens | Token holder |

**Metadata**:
- Name and symbol set by campaign owner during finalization
- Immutable `campaignId` reference
- Cannot mint beyond MAX_SUPPLY

### Network Configuration

| Network | Chain ID | RPC URL | Block Explorer |
|---------|----------|---------|----------------|
| **Sepolia** | 11155111 | `https://sepolia.infura.io/v3/...` | https://sepolia.etherscan.io |
| **Localhost** | 31337 | `http://127.0.0.1:8545` | N/A |
| **Hardhat** | 31337 | In-memory | N/A |

### Compiler Configuration

```json
{
  "solidity": "0.8.24",
  "optimizer": {
    "enabled": true,
    "runs": 200,
    "viaIR": true
  },
  "evmVersion": "cancun"
}
```

**Note**: `viaIR: true` is required for FHEVM contracts to compile correctly.

### Security Features

- **Access Control**: Owner-only functions protected by modifiers
- **FHE Permissions**: Strict permission management via `FHE.allow()`
- **Reentrancy Protection**: NonReentrant modifiers on external calls
- **Input Validation**: Comprehensive checks on all parameters
- **State Machine**: Campaign lifecycle enforced by state checks
- **Locked Funds Isolation**: Per-campaign fund locks prevent double-spending
- **Cache Expiration**: 10-minute timeout on decrypted values
- **Max Supply Enforcement**: Token minting capped at 1 billion

---

## 📚 Additional Resources

- **FHEVM Documentation**: https://docs.zama.ai/fhevm
- **Hardhat Documentation**: https://hardhat.org/docs
- **Next.js Documentation**: https://nextjs.org/docs
- **Privy Documentation**: https://docs.privy.io
- **Viem Documentation**: https://viem.sh

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'Add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Open a pull request

---

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.

---

## 🔒 Privacy & Security Notice

This platform uses **FHEVM (Fully Homomorphic Encryption)** to ensure:
- Contribution amounts are **never** visible on-chain in plaintext
- Only authorized parties (contributors + campaign owner) can decrypt values
- Mathematical operations (summing contributions) work on encrypted data
- Zero-knowledge proofs validate encrypted values without revealing them

**Security Audits**: TBD

Built with ❤️ by [@cris_thedev](https://x.com/cris_thedev) using Zama's FHEVM technology
