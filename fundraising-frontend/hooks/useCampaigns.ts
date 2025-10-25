import { useCallback, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import {
  createWalletClient,
  custom,
  publicActions,
  parseEther,
  toHex,
} from "viem";
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

      const MAX_UINT64 = BigInt("18446744073709551615");
      if (targetWei > MAX_UINT64) {
        throw new Error("Target amount too large for uint64");
      }

      const durationSeconds = BigInt(durationDays * 24 * 60 * 60);

      console.log("Creating campaign with target (Wei):", targetWei.toString());

      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "createCampaign",
        args: [title, description, targetWei, durationSeconds],
      });

      await client.waitForTransactionReceipt({ hash });
      return hash;
    } catch (error) {
      console.error("Error creating campaign:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const contribute = async (campaignId: number, amount: string) => {
    try {
      setLoading(true);
      const client = await getClient();

      const amountWei = parseEther(amount);

      const MAX_UINT64 = BigInt("18446744073709551615");
      if (amountWei > MAX_UINT64) {
        throw new Error("Amount too large for uint64");
      }

      console.log(
        "💰 Contributing:",
        amount,
        "ETH (",
        amountWei.toString(),
        "Wei)"
      );

      const { encryptedData, proof } = await encrypt64(amountWei);

      const encryptedDataHex = toHex(encryptedData);
      const proofHex = toHex(proof);

      console.log("📤 Sending transaction...");

      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "contribute",
        args: [campaignId, encryptedDataHex, proofHex],
      });

      console.log("⏳ Transaction submitted:", hash);
      const receipt = await client.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        console.log("✅ Transaction confirmed!");
      } else {
        throw new Error("Transaction reverted");
      }

      return hash;
    } catch (error) {
      setLoading(false);
      console.error("❌ Contribution failed:", error);
      throw error;
    }
  };

  const requestMyContributionDecryption = async (campaignId: number) => {
    setLoading(true);
    try {
      const client = await getClient();

      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "requestMyContributionDecryption",
        args: [campaignId],
      });

      await client.waitForTransactionReceipt({ hash });
      console.log("✅ Decryption requested, waiting for callback...");
      return hash;
    } catch (error) {
      console.error("Error requesting decryption:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const requestTotalRaisedDecryption = async (campaignId: number) => {
    setLoading(true);
    try {
      const client = await getClient();

      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "requestTotalRaisedDecryption",
        args: [campaignId],
      });

      await client.waitForTransactionReceipt({ hash });
      console.log(
        "✅ Total raised decryption requested, waiting for callback..."
      );
      return hash;
    } catch (error) {
      console.error("Error requesting total decryption:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getMyContribution = async (campaignId: number): Promise<bigint> => {
    try {
      const client = await getClient();

      const contribution = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "getMyContribution",
        args: [campaignId],
      });

      return BigInt(contribution);
    } catch (error) {
      console.error("Error fetching my contribution:", error);
      throw error;
    }
  };

  const getTotalRaised = async (campaignId: number): Promise<bigint> => {
    try {
      const client = await getClient();

      const total = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "getTotalRaised",
        args: [campaignId],
      });

      return BigInt(total);
    } catch (error) {
      console.error("Error fetching total raised:", error);
      throw error;
    }
  };

  const finalizeCampaign = async (campaignId: number) => {
    setLoading(true);
    try {
      const client = await getClient();

      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "finalizeCampaign",
        args: [campaignId],
      });

      await client.waitForTransactionReceipt({ hash });
      return hash;
    } catch (error) {
      console.error("Error finalizing campaign:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const cancelCampaign = async (campaignId: number) => {
    setLoading(true);
    try {
      const client = await getClient();

      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "cancelCampaign",
        args: [campaignId],
      });

      await client.waitForTransactionReceipt({ hash });
      return hash;
    } catch (error) {
      console.error("Error cancelling campaign:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const claimTokens = async (campaignId: number) => {
    setLoading(true);
    try {
      const client = await getClient();

      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "claimTokens",
        args: [campaignId],
      });

      await client.waitForTransactionReceipt({ hash });
      return hash;
    } catch (error) {
      console.error("Error claiming tokens:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getCampaign = async (campaignId: number): Promise<Campaign> => {
    try {
      const client = await getClient();

      const result = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "getCampaign",
        args: [campaignId],
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

  const getContributionStatus = async (
    campaignId: number,
    userAddress: string
  ): Promise<{
    status: number;
    contribution: bigint;
    cacheExpiry: bigint;
  }> => {
    try {
      const client = await getClient();

      const result = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "getContributionStatus",
        args: [campaignId, userAddress as `0x${string}`],
      });

      return {
        status: Number(result[0]),
        contribution: BigInt(result[1]),
        cacheExpiry: BigInt(result[2]),
      };
    } catch (error) {
      console.error("Error fetching contribution status:", error);
      throw error;
    }
  };

  const checkHasContribution = async (
    campaignId: number,
    userAddress: string
  ): Promise<boolean> => {
    try {
      const client = await getClient();

      const result = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "hasContribution",
        args: [campaignId, userAddress as `0x${string}`],
      });

      return result as boolean;
    } catch (error) {
      console.error("Error checking contribution:", error);
      return false;
    }
  };

  const getTotalRaisedStatus = async (
    campaignId: number
  ): Promise<{
    status: number;
    totalRaised: bigint;
    cacheExpiry: bigint;
  }> => {
    try {
      const client = await getClient();

      const result = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "getTotalRaisedStatus",
        args: [campaignId],
      });

      return {
        status: Number(result[0]),
        totalRaised: BigInt(result[1]),
        cacheExpiry: BigInt(result[2]),
      };
    } catch (error) {
      console.error("Error fetching total raised status:", error);
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
    requestMyContributionDecryption,
    requestTotalRaisedDecryption,
    getMyContribution,
    getTotalRaised,
    getContributionStatus,
    checkHasContribution,
    getTotalRaisedStatus,
  };
}
