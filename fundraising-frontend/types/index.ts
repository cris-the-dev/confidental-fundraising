export interface Campaign {
  id: number;
  owner: string;
  title: string;
  description: string;
  targetAmount: bigint;
  deadline: number;
  finalized: boolean;
  cancelled: boolean;
  tokenAddress?: `0x${string}`;
}

export interface FhevmInstance {
  
  instance: any;
  publicKey: string;
}

export interface ContributionData {
  campaignId: number;
  encryptedAmount: string;
  hasContributed: boolean;
}

export enum DecryptStatus {
  NONE = 0,
  PROCESSING = 1,
  DECRYPTED = 2,
}