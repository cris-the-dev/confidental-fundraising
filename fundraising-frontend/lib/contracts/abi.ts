export const FUNDRAISING_ABI = [
  {
    inputs: [],
    name: "ContributionNotFound",
    type: "error",
  },
  {
    inputs: [],
    name: "DataProcessing",
    type: "error",
  },
  {
    inputs: [],
    name: "HandlesAlreadySavedForRequestID",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "campaignId",
        type: "uint256",
      },
    ],
    name: "CampaignCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "campaignId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "title",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint64",
        name: "targetAmount",
        type: "uint64",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "CampaignCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "campaignId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "targetReached",
        type: "bool",
      },
    ],
    name: "CampaignFinalized",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "campaignId",
        type: "uint16",
      },
    ],
    name: "cancelCampaign",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "campaignId",
        type: "uint16",
      },
    ],
    name: "claimTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "campaignId",
        type: "uint16",
      },
      {
        internalType: "externalEuint8",
        name: "encryptedAmount",
        type: "bytes32",
      },
      {
        internalType: "bytes",
        name: "inputProof",
        type: "bytes",
      },
    ],
    name: "contribute",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "campaignId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "contributor",
        type: "address",
      },
    ],
    name: "ContributionMade",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "title",
        type: "string",
      },
      {
        internalType: "string",
        name: "description",
        type: "string",
      },
      {
        internalType: "uint8",
        name: "target",
        type: "uint8",
      },
      {
        internalType: "uint256",
        name: "duration",
        type: "uint256",
      },
    ],
    name: "createCampaign",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "campaignId",
        type: "uint16",
      },
    ],
    name: "finalizeCampaign",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "campaignId",
        type: "uint16",
      },
    ],
    name: "requestMyContributionDecryption",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "campaignId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "contributor",
        type: "address",
      },
    ],
    name: "TokensClaimed",
    type: "event",
  },
  {
    inputs: [],
    name: "campaignCount",
    outputs: [
      {
        internalType: "uint16",
        name: "",
        type: "uint16",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "",
        type: "uint16",
      },
    ],
    name: "campaigns",
    outputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "string",
        name: "title",
        type: "string",
      },
      {
        internalType: "string",
        name: "description",
        type: "string",
      },
      {
        internalType: "euint8",
        name: "totalRaised",
        type: "bytes32",
      },
      {
        internalType: "uint8",
        name: "targetAmount",
        type: "uint8",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "finalized",
        type: "bool",
      },
      {
        internalType: "bool",
        name: "cancelled",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "campaignId",
        type: "uint16",
      },
    ],
    name: "getCampaign",
    outputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "string",
        name: "title",
        type: "string",
      },
      {
        internalType: "string",
        name: "description",
        type: "string",
      },
      {
        internalType: "uint8",
        name: "targetAmount",
        type: "uint8",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
      {
        internalType: "bool",
        name: "finalized",
        type: "bool",
      },
      {
        internalType: "bool",
        name: "cancelled",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "campaignId",
        type: "uint16",
      },
    ],
    name: "getMyContribution",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint16",
        name: "",
        type: "uint16",
      },
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "hasClaimed",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "protocolId",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
] as const;
