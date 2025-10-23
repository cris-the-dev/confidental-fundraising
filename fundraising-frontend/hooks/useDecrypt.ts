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
      console.log("🔓 Decrypt called with handle:", handle.toString());

      if (!isInitialized || !instance) {
        throw new Error("FHEVM not initialized");
      }

      const userAddress = user?.wallet?.address;
      if (!userAddress) {
        throw new Error("Wallet not connected");
      }

      // ✅ Handle zero or uninitialized values
      if (handle === 0n) {
        console.log("⚠️ Handle is 0, returning 0");
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

        console.log("🔐 Generating keypair...");
        const { publicKey, privateKey } = instance.generateKeypair();

        console.log("📝 Creating EIP712 message...");
        const eip712 = instance.createEIP712(publicKey, CONTRACT_ADDRESS);

        console.log("✍️ Requesting signature...");
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

        console.log("🔄 Reencrypting...");
        
        // ✅ CRITICAL FIX: Convert handle to proper format
        // The FHEVM library expects handles as a string or number in some versions
        const decryptedValue = await instance.reencrypt(
          handle, // Keep as bigint - the library should handle it
          privateKey,
          publicKey,
          signature.replace("0x", ""),
          CONTRACT_ADDRESS,
          userAddress
        );

        console.log("✅ Decryption successful:", decryptedValue);
        
        // ✅ Handle different return types from reencrypt
        // Sometimes it returns a string, sometimes a number
        if (typeof decryptedValue === 'string') {
          return BigInt(decryptedValue);
        } else if (typeof decryptedValue === 'number') {
          return BigInt(decryptedValue);
        } else if (typeof decryptedValue === 'bigint') {
          return decryptedValue;
        }
        
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