import { useCallback, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, publicActions, parseEther } from "viem";
import { sepolia } from "viem/chains";
import { useEncrypt } from "./useEncrypt";
import { CONTRACT_ADDRESS } from "../lib/contracts/config";
import { FUNDRAISING_ABI } from "../lib/contracts/abi";
import { Campaign } from "../types";

export function useCampaigns() {
  const { wallets } = useWallets();
  const { encrypt64 } = useEncrypt();
  const [loading, setLoading] = useState(false);

  const getClient = useCallback(async () => {
    const wallet = wallets[0];
    if (!wallet) throw new Error("No wallet connected");

    await wallet.switchChain(sepolia.id);
    const provider = await wallet.getEthereumProvider();

    return createWalletClient({
      account: wallet.address as `0x${string}`,
      chain: sepolia,
      transport: custom(provider),
    }).extend(publicActions);
  }, [wallets]);

  // ==========================================
  // WRITE OPERATIONS
  // ==========================================

  const createCampaign = async (
    title: string,
    description: string,
    targetAmount: string,
    durationDays: number
  ) => {
    setLoading(true);
    try {
      const client = await getClient();
      const targetWei = parseEther(targetAmount);
      const durationSeconds = BigInt(durationDays * 24 * 60 * 60);

      console.log("📝 Creating campaign...");
      console.log("  - Title:", title);
      console.log("  - Target:", targetAmount, "ETH");
      console.log("  - Duration:", durationDays, "days");

      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "createCampaign",
        args: [title, description, BigInt(targetWei), durationSeconds],
      });

      console.log("⏳ Waiting for confirmation...");
      await client.waitForTransactionReceipt({ hash });
      console.log("✅ Campaign created!");

      return hash;
    } catch (error) {
      console.error("❌ Error creating campaign:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const contribute = async (campaignId: number, amount: string) => {
    setLoading(true);
    try {
      const client = await getClient();
      const amountWei = parseEther(amount);

      console.log("🔐 Encrypting contribution amount...");
      console.log("  - Amount:", amount, "ETH");

      // Encrypt the amount using the useEncrypt hook
      const { data: encryptedData, proof } = await encrypt64(amountWei);

      console.log("📤 Submitting encrypted contribution...");

      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "contribute",

        args: [BigInt(campaignId), encryptedData as any, proof],
      });

      console.log("⏳ Waiting for confirmation...");
      await client.waitForTransactionReceipt({ hash });
      console.log("✅ Contribution successful!");

      return hash;
    } catch (error) {
      console.error("❌ Error contributing:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const finalizeCampaign = async (campaignId: number) => {
    setLoading(true);
    try {
      const client = await getClient();

      console.log("🏁 Finalizing campaign...");

      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "finalizeCampaign",
        args: [BigInt(campaignId)],
      });

      await client.waitForTransactionReceipt({ hash });
      console.log("✅ Campaign finalized!");

      return hash;
    } catch (error) {
      console.error("❌ Error finalizing campaign:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const cancelCampaign = async (campaignId: number) => {
    setLoading(true);
    try {
      const client = await getClient();

      console.log("🚫 Cancelling campaign...");

      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "cancelCampaign",
        args: [BigInt(campaignId)],
      });

      await client.waitForTransactionReceipt({ hash });
      console.log("✅ Campaign cancelled!");

      return hash;
    } catch (error) {
      console.error("❌ Error cancelling campaign:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const claimTokens = async (campaignId: number) => {
    setLoading(true);
    try {
      const client = await getClient();

      console.log("🎁 Claiming tokens...");

      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "claimTokens",
        args: [BigInt(campaignId)],
      });

      await client.waitForTransactionReceipt({ hash });
      console.log("✅ Tokens claimed!");

      return hash;
    } catch (error) {
      console.error("❌ Error claiming tokens:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // READ OPERATIONS
  // ==========================================

  const getCampaign = async (campaignId: number): Promise<Campaign> => {
    try {
      const client = await getClient();

      const result = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "getCampaign",
        args: [BigInt(campaignId)],
      });

      return {
        id: campaignId,
        owner: result[0],
        title: result[1],
        description: result[2],
        targetAmount: result[3],
        deadline: Number(result[4]),
        finalized: result[5],
        cancelled: result[6],
      };
    } catch (error) {
      console.error("Error fetching campaign:", error);
      throw error;
    }
  };

  const getCampaignCount = async (): Promise<number> => {
    try {
      const client = await getClient();

      const count = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "campaignCount",
      });

      return Number(count);
    } catch (error) {
      console.error("Error fetching campaign count:", error);
      throw error;
    }
  };

  const getEncryptedTotal = async (campaignId: number): Promise<bigint> => {
    try {
      const client = await getClient();

      const total = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "getEncryptedTotal",
        args: [BigInt(campaignId)],
      });

      return total as bigint;
    } catch (error) {
      console.error("Error fetching encrypted total:", error);
      throw error;
    }
  };

  const getMyContribution = async (campaignId: number): Promise<bigint> => {
    try {
      const client = await getClient();

      const contribution = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "getMyContribution",
        args: [BigInt(campaignId)],
      });

      return contribution as bigint;
    } catch (error) {
      console.error("Error fetching my contribution:", error);
      throw error;
    }
  };

  return {
    loading,
    createCampaign,
    contribute,
    finalizeCampaign,
    cancelCampaign,
    claimTokens,
    getCampaign,
    getCampaignCount,
    getEncryptedTotal,
    getMyContribution,
  };
}
