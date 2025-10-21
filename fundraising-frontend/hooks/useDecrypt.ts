"use client";

import { useState, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom } from "viem";
import { sepolia } from "viem/chains";
import { CONTRACT_ADDRESS } from "../lib/contracts/config";
import { useFhevm } from "../contexts/FhevmContext";

export const useDecrypt = () => {
  const { instance, isInitialized } = useFhevm();
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decrypt = useCallback(
    async (handle: bigint): Promise<bigint> => {
      if (!isInitialized || !instance) {
        throw new Error("FHEVM not initialized");
      }

      const userAddress = user?.wallet?.address;
      if (!userAddress) {
        throw new Error("Wallet not connected");
      }

      if (handle === 0n) {
        return 0n;
      }

      setIsDecrypting(true);
      setError(null);

      try {
        const wallet = wallets[0];
        if (!wallet) throw new Error("No wallet found");

        const provider = await wallet.getEthereumProvider();

        const walletClient = createWalletClient({
          account: userAddress as `0x${string}`,
          chain: sepolia,
          transport: custom(provider),
        });

        const { publicKey, privateKey } = instance.generateKeypair();
        const eip712 = instance.createEIP712(publicKey, CONTRACT_ADDRESS);

        const signature = await walletClient.signTypedData({
          account: userAddress as `0x${string}`,
          domain: {
            name: eip712.domain.name,
            version: eip712.domain.version,
            chainId: eip712.domain.chainId,
            verifyingContract: eip712.domain.verifyingContract as `0x${string}`,
          },
          types: eip712.types,
          primaryType: "Reencrypt",
          message: eip712.message,
        });

        const decryptedValue = await instance.reencrypt(
          handle,
          privateKey,
          publicKey,
          signature.replace("0x", ""),
          CONTRACT_ADDRESS,
          userAddress
        );

        return BigInt(decryptedValue);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Decryption failed";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setIsDecrypting(false);
      }
    },
    [instance, isInitialized, user, wallets]
  );

  return { decrypt, isDecrypting, error };
};
