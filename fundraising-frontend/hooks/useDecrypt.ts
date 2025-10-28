"use client";

import { useState, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom } from "viem";
import { sepolia } from "viem/chains";
import { useFhevm } from "../contexts/FhevmContext";
import { HandleContractPair } from "@zama-fhe/relayer-sdk/web";
import { BrowserProvider } from 'ethers';

export const useDecrypt = () => {
  const { instance, isInitialized } = useFhevm();
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decrypt = useCallback(
    async (handle: string, contractAddress: string): Promise<bigint> => {
      console.log("🔓 Decrypt called with handle:", handle.toString());
      console.log("📍 Contract address:", contractAddress);

      if (!isInitialized || !instance) {
        throw new Error("FHEVM not initialized");
      }

      const userAddress = user?.wallet?.address;
      if (!userAddress) {
        throw new Error("Wallet not connected");
      }

      setIsDecrypting(true);
      setError(null);

      try {
        const wallet = wallets[0];
        if (!wallet) throw new Error("No wallet found");

        const provider = await wallet.getEthereumProvider();
        const ethersProvider = new BrowserProvider(provider);

        const walletClient = createWalletClient({
          account: userAddress as `0x${string}`,
          chain: sepolia,
          transport: custom(provider),
        });

        console.log("🔐 Generating keypair...");
        const keypair = instance.generateKeypair();

        const handleContractPairs = [
          {
            handle: handle,
            contractAddress: contractAddress,
          } as HandleContractPair,
        ];

        const startTimeStamp = Math.floor(Date.now() / 1000).toString();
        const durationDays = "10";
        const contractAddresses = [contractAddress];

        const eip712 = instance.createEIP712(
          keypair.publicKey,
          contractAddresses,
          startTimeStamp,
          durationDays
        );

        (await ethersProvider.getSigner()).signTypedData
        const signature = await (await ethersProvider.getSigner()).signTypedData(
          eip712.domain,
          {
            UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
          },
          eip712.message
        );

        const result = await instance.userDecrypt(
          handleContractPairs,
          keypair.privateKey,
          keypair.publicKey,
          signature.replace("0x", ""),
          contractAddresses,
          wallet.address,
          startTimeStamp,
          durationDays
        );

        const decryptedValue = result[handle];

        console.log("✅ Decryption successful:", decryptedValue);

        return BigInt(decryptedValue);
      } catch (err) {
        console.error("❌ Decryption error:", err);
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
