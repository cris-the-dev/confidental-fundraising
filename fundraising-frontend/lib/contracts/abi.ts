// lib/contracts/abi.ts
export const FUNDRAISING_ABI = [
  {
    "type": "function",
    "name": "createCampaign",
    "inputs": [
      { "name": "title", "type": "string" },
      { "name": "description", "type": "string" },
      { "name": "target", "type": "uint64" },
      { "name": "duration", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "contribute",
    "inputs": [
      { "name": "campaignId", "type": "uint256" },
      { "name": "encAmount", "type": "bytes32" },
      { "name": "inputProof", "type": "bytes" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "finalizeCampaign",
    "inputs": [{ "name": "campaignId", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelCampaign",
    "inputs": [{ "name": "campaignId", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "claimTokens",
    "inputs": [{ "name": "campaignId", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getCampaign",
    "inputs": [{ "name": "campaignId", "type": "uint256" }],
    "outputs": [
      { "name": "owner", "type": "address" },
      { "name": "title", "type": "string" },
      { "name": "description", "type": "string" },
      { "name": "targetAmount", "type": "uint64" },
      { "name": "deadline", "type": "uint256" },
      { "name": "finalized", "type": "bool" },
      { "name": "cancelled", "type": "bool" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getEncryptedTotal",
    "inputs": [{ "name": "campaignId", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getMyContribution",
    "inputs": [{ "name": "campaignId", "type": "uint256" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "campaignCount",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "campaigns",
    "inputs": [{ "name": "", "type": "uint256" }],
    "outputs": [
      { "name": "owner", "type": "address" },
      { "name": "title", "type": "string" },
      { "name": "description", "type": "string" },
      { "name": "totalRaised", "type": "uint256" },
      { "name": "targetAmount", "type": "uint64" },
      { "name": "deadline", "type": "uint256" },
      { "name": "finalized", "type": "bool" },
      { "name": "cancelled", "type": "bool" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasClaimed",
    "inputs": [
      { "name": "", "type": "uint256" },
      { "name": "", "type": "address" }
    ],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "CampaignCreated",
    "inputs": [
      { "name": "campaignId", "type": "uint256", "indexed": true },
      { "name": "owner", "type": "address", "indexed": true },
      { "name": "title", "type": "string", "indexed": false },
      { "name": "targetAmount", "type": "uint64", "indexed": false },
      { "name": "deadline", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "ContributionMade",
    "inputs": [
      { "name": "campaignId", "type": "uint256", "indexed": true },
      { "name": "contributor", "type": "address", "indexed": true }
    ]
  },
  {
    "type": "event",
    "name": "CampaignFinalized",
    "inputs": [
      { "name": "campaignId", "type": "uint256", "indexed": true },
      { "name": "targetReached", "type": "bool", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "CampaignCancelled",
    "inputs": [
      { "name": "campaignId", "type": "uint256", "indexed": true }
    ]
  },
  {
    "type": "event",
    "name": "TokensClaimed",
    "inputs": [
      { "name": "campaignId", "type": "uint256", "indexed": true },
      { "name": "contributor", "type": "address", "indexed": true }
    ]
  }
] as const;