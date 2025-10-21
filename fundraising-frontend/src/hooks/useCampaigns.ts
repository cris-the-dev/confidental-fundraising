import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseEther,
} from "viem";
import { sepolia } from "viem/chains";
import {
  CONTRACT_ADDRESS,
  RPC_URL,
} from "../lib/contracts/config";
import { Campaign } from "../types/campaign";
import { FUNDRAISING_ABI } from "../lib/contracts/abi";

export const useCampaigns = () => {
  const { user } = usePrivy();
  const { wallets } = useWallets();

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL),
  });

  const getWalletClient = async () => {
    const wallet = wallets[0];
    if (!wallet) throw new Error("No wallet connected");

    const provider = await wallet.getEthereumProvider();
    return createWalletClient({
      account: user?.wallet?.address as `0x${string}`,
      chain: sepolia,
      transport: custom(provider),
    });
  };

  const getCampaignCount = async (): Promise<number> => {
    const count = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: FUNDRAISING_ABI,
      functionName: "campaignCount",
    });
    return Number(count);
  };

  const getCampaign = async (campaignId: number): Promise<Campaign> => {
    const data = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: FUNDRAISING_ABI,
      functionName: "getCampaign",
      args: [BigInt(campaignId)],
    });

    const [
      owner,
      title,
      description,
      targetAmount,
      deadline,
      finalized,
      cancelled,
    ] = data as [string, string, string, bigint, bigint, boolean, boolean];

    return {
      owner,
      title,
      description,
      targetAmount,
      deadline,
      finalized,
      cancelled,
    };
  };

  const createCampaign = async (
    title: string,
    description: string,
    targetEth: string,
    durationDays: number
  ) => {
    const walletClient = await getWalletClient();
    const targetWei = parseEther(targetEth);
    const durationSeconds = BigInt(durationDays * 24 * 60 * 60);

    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: FUNDRAISING_ABI,
      functionName: "createCampaign",
      args: [title, description, targetWei, durationSeconds],
    });

    return hash;
  };

  const contribute = async (
    campaignId: number,
    encryptedData: string,
    proof: `0x${string}`
  ) => {
    const walletClient = await getWalletClient();

    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: FUNDRAISING_ABI,
      functionName: "contribute",
      args: [BigInt(campaignId), encryptedData, proof],
    });

    return hash;
  };

  const getEncryptedTotal = async (campaignId: number): Promise<bigint> => {
    const total = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: FUNDRAISING_ABI,
      functionName: "getEncryptedTotal",
      args: [BigInt(campaignId)],
    });
    return total as bigint;
  };

  return {
    getCampaignCount,
    getCampaign,
    createCampaign,
    contribute,
    getEncryptedTotal,
  };
};
