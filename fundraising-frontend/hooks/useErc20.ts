import { useCallback, useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, publicActions } from "viem";
import { sepolia } from "viem/chains";
import { ERC20_ABI } from "../lib/contracts/ercAbi";

export function useErc20() {
  const { wallets } = useWallets();
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

  const getTokenBalance = async (
    tokenAddress: string,
    userAddress: string
  ): Promise<bigint> => {
    try {
      const client = await getClient();

      const balance = await client.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [userAddress as `0x${string}`],
      });

      return BigInt(balance);
    } catch (error) {
      console.error("Error fetching token balance:", error);
      throw error;
    }
  };

  const getTokenInfo = async (
    tokenAddress: string
  ): Promise<{
    name: string;
    symbol: string;
    decimals: number;
  }> => {
    try {
      const client = await getClient();

      const [name, symbol, decimals] = await Promise.all([
        client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "name",
        }),
        client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "symbol",
        }),
        client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "decimals",
        }),
      ]);

      return {
        name: name as string,
        symbol: symbol as string,
        decimals: Number(decimals),
      };
    } catch (error) {
      console.error("Error fetching token info:", error);
      throw error;
    }
  };

  const getTotalSupply = async (tokenAddress: string): Promise<bigint> => {
    try {
      const client = await getClient();

      const totalSupply = await client.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "totalSupply",
      });

      return BigInt(totalSupply);
    } catch (error) {
      console.error("Error fetching total supply:", error);
      throw error;
    }
  };

  return {
    loading,
    getTokenBalance,
    getTokenInfo,
    getTotalSupply,
  };
}
