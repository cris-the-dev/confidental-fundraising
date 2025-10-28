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
import { CONTRACT_ADDRESS, VAULT_ADDRESS } from "../lib/contracts/config";
import { FUNDRAISING_ABI } from "../lib/contracts/abi";
import { Campaign } from "../types";
import { VAULT_ABI } from "../lib/contracts/vaultAbi";

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


  const finalizeCampaign = async (
    campaignId: number,
    tokenName: string,
    tokenSymbol: string
  ) => {
    setLoading(true);
    try {
      const client = await getClient();

      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "finalizeCampaign",
        args: [campaignId, tokenName, tokenSymbol],
      });

      await client.waitForTransactionReceipt({ hash });
      console.log("✅ Campaign finalized");
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
        tokenAddress: result[7],
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

  const checkHasClaimed = async (
    campaignId: number,
    userAddress: string
  ): Promise<boolean> => {
    try {
      const client = await getClient();

      const result = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "hasClaimed",
        args: [campaignId, userAddress as `0x${string}`],
      });

      return result as boolean;
    } catch (error) {
      console.error("Error checking if claimed:", error);
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

  // Vault deposit
  const depositToVault = async (amount: string) => {
    setLoading(true);
    try {
      const client = await getClient();
      const amountWei = parseEther(amount);

      // Validate uint64 range
      const MAX_UINT64 = BigInt("18446744073709551615");
      if (amountWei > MAX_UINT64) {
        throw new Error("Amount too large for uint64");
      }

      const hash = await client.writeContract({
        address: VAULT_ADDRESS, // Add this to your config
        abi: VAULT_ABI, // Add vault ABI
        functionName: "deposit",
        args: [],
        value: amountWei,
      });

      await client.waitForTransactionReceipt({ hash });
      return hash;
    } catch (error) {
      console.error("Error depositing to vault:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Request available balance decryption
  const requestAvailableBalanceDecryption = async () => {
    setLoading(true);
    try {
      const client = await getClient();

      const hash = await client.writeContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "requestAvailableBalanceDecryption",
        args: [],
      });

      await client.waitForTransactionReceipt({ hash });
      console.log("✅ Available balance decryption requested");
      return hash;
    } catch (error) {
      console.error("Error requesting balance decryption:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };


  // Get available balance status
  const getAvailableBalanceStatus = async (): Promise<{
    status: number;
    availableAmount: bigint;
    cacheExpiry: bigint;
  }> => {
    try {
      const client = await getClient();
      const userAddress = wallets[0]?.address;

      if (!userAddress) throw new Error("No wallet connected");

      const result = await client.readContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "getAvailableBalanceStatus",
      });

      return {
        status: Number(result[0]),
        availableAmount: BigInt(result[1]),
        cacheExpiry: BigInt(result[2]),
      };
    } catch (error) {
      console.error("Error fetching balance status:", error);
      throw error;
    }
  };

  // Withdraw from vault
  const withdrawFromVault = async (amount: string) => {
    setLoading(true);
    try {
      const client = await getClient();
      const amountWei = parseEther(amount);

      // Validate uint64 range
      const MAX_UINT64 = BigInt("18446744073709551615");
      if (amountWei > MAX_UINT64) {
        throw new Error("Amount too large for uint64");
      }

      const hash = await client.writeContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "withdraw",
        args: [amountWei],
      });

      await client.waitForTransactionReceipt({ hash });
      return hash;
    } catch (error) {
      console.error("Error withdrawing from vault:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getEncryptedBalanceAndLocked = async (): Promise<{
    encryptedBalance: string;
    encryptedLocked: string;
  }> => {
    try {
      const client = await getClient();
      const userAddress = wallets[0]?.address;

      if (!userAddress) throw new Error("No wallet connected");

      const result = await client.readContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "getEncryptedBalanceAndLocked",
      });

      return {
        encryptedBalance: result[0],
        encryptedLocked: result[1]
      };
    } catch (error) {
      console.error("Error fetching balance status:", error);
      throw error;
    }
  };

  const getEncryptedContribution = async (
    campaignId: number,
    userAddress: string
  ): Promise<string> => {
    try {
      const client = await getClient();

      const result = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "getEncryptedContribution",
        args: [campaignId, userAddress as `0x${string}`],
      });

      return result as string;
    } catch (error) {
      console.error("Error fetching encrypted contribution:", error);
      throw error;
    }
  };

  const getEncryptedTotalRaised = async (
    campaignId: number
  ): Promise<string> => {
    try {
      const client = await getClient();

      const result = await client.readContract({
        address: CONTRACT_ADDRESS,
        abi: FUNDRAISING_ABI,
        functionName: "getEncryptedTotalRaised",
        args: [campaignId],
      });

      return result as string;
    } catch (error) {
      console.error("Error fetching encrypted total raised:", error);
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
    getContributionStatus,
    checkHasContribution,
    checkHasClaimed,
    getTotalRaisedStatus,
    depositToVault,
    requestAvailableBalanceDecryption,
    getAvailableBalanceStatus,
    withdrawFromVault,
    getEncryptedBalanceAndLocked,
    getEncryptedContribution,
    getEncryptedTotalRaised,
  };
}
