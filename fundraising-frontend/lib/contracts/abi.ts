export const FUNDRAISING_ABI = [
  {
    inputs: [],
    name: "AlreadyCancelled",
    type: "error",
  },
  {
    inputs: [],
    name: "AlreadyClaimed",
    type: "error",
  },
  {
    inputs: [],
    name: "AlreadyFinalized",
    type: "error",
  },
  {
    inputs: [],
    name: "CacheExpired",
    type: "error",
  },
  {
    inputs: [],
    name: "CampaignEnded",
    type: "error",
  },
  {
    inputs: [],
    name: "CampaignNotExist",
    type: "error",
  },
  {
    inputs: [],
    name: "CampaignNotFinalized",
    type: "error",
  },
  {
    inputs: [],
    name: "CampaignStillActive",
    type: "error",
  },
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
    name: "DecryptAlreadyInProgress",
    type: "error",
  },
  {
    inputs: [],
    name: "HandlesAlreadySavedForRequestID",
    type: "error",
  },
  {
    inputs: [],
    name: "InvalidKMSSignatures",
    type: "error",
  },
  {
    inputs: [],
    name: "MyContributionNotDecrypted",
    type: "error",
  },
  {
    inputs: [],
    name: "NoHandleFoundForRequestID",
    type: "error",
  },
  {
    inputs: [],
    name: "OnlyOwner",
    type: "error",
  },
  {
    inputs: [],
    name: "TotalRaisedNotDecrypted",
    type: "error",
  },
  {
    inputs: [],
    name: "UnauthorizedAccess",
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
        internalType: "uint256",
        name: "targetAmount",
        type: "uint256",
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
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "requestID",
        type: "uint256",
      },
    ],
    name: "DecryptionFulfilled",
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
        name: "contributor",
        type: "address",
      },
    ],
    name: "TokensClaimed",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "requestId",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "cleartexts",
        type: "bytes",
      },
      {
        internalType: "bytes",
        name: "decryptionProof",
        type: "bytes",
      },
    ],
    name: "callbackDecryptMyContribution",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "requestId",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "cleartexts",
        type: "bytes",
      },
      {
        internalType: "bytes",
        name: "decryptionProof",
        type: "bytes",
      },
    ],
    name: "callbackDecryptTotalRaised",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
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
        internalType: "euint64",
        name: "totalRaised",
        type: "bytes32",
      },
      {
        internalType: "uint64",
        name: "targetAmount",
        type: "uint64",
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
        internalType: "externalEuint64",
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
        internalType: "uint64",
        name: "target",
        type: "uint64",
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
        internalType: "uint64",
        name: "targetAmount",
        type: "uint64",
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
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "getContributionStatus",
    outputs: [
      {
        internalType: "enum FundraisingStruct.DecryptStatus",
        name: "status",
        type: "uint8",
      },
      {
        internalType: "uint64",
        name: "contribution",
        type: "uint64",
      },
      {
        internalType: "uint256",
        name: "cacheExpiry",
        type: "uint256",
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
        internalType: "uint64",
        name: "",
        type: "uint64",
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
    name: "getTotalRaised",
    outputs: [
      {
        internalType: "uint64",
        name: "",
        type: "uint64",
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
    name: "getTotalRaisedStatus",
    outputs: [
      {
        internalType: "enum FundraisingStruct.DecryptStatus",
        name: "status",
        type: "uint8",
      },
      {
        internalType: "uint64",
        name: "totalRaised",
        type: "uint64",
      },
      {
        internalType: "uint256",
        name: "cacheExpiry",
        type: "uint256",
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
    inputs: [
      {
        internalType: "uint16",
        name: "campaignId",
        type: "uint16",
      },
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "hasContribution",
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
    inputs: [
      {
        internalType: "uint16",
        name: "campaignId",
        type: "uint16",
      },
    ],
    name: "requestTotalRaisedDecryption",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
