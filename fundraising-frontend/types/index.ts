export interface Campaign {
  id: number;
  owner: string;
  title: string;
  description: string;
  targetAmount: bigint;
  deadline: number;
  finalized: boolean;
  cancelled: boolean;
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