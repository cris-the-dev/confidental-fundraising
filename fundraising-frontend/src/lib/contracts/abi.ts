export const FUNDRAISING_ABI = [
  {
    inputs: [
      { name: "title", type: "string" },
      { name: "description", type: "string" },
      { name: "target", type: "uint64" },
      { name: "duration", type: "uint256" },
    ],
    name: "createCampaign",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "campaignId", type: "uint256" },
      { name: "encAmount", type: "einput" },
      { name: "inputProof", type: "bytes" },
    ],
    name: "contribute",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "campaignId", type: "uint256" }],
    name: "getCampaign",
    outputs: [
      { name: "owner", type: "address" },
      { name: "title", type: "string" },
      { name: "description", type: "string" },
      { name: "targetAmount", type: "uint64" },
      { name: "deadline", type: "uint256" },
      { name: "finalized", type: "bool" },
      { name: "cancelled", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "campaignId", type: "uint256" }],
    name: "getEncryptedTotal",
    outputs: [{ name: "", type: "euint64" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "campaignCount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "campaignId", type: "uint256" },
      { indexed: true, name: "contributor", type: "address" },
    ],
    name: "ContributionMade",
    type: "event",
  },
] as const;
