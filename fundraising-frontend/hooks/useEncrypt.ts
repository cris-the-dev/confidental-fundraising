import { useState, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useFhevm } from "../contexts/FhevmContext";
import { CONTRACT_ADDRESS } from "../lib/contracts/config";

interface EncryptedData {
  encryptedData: Uint8Array;
  proof: Uint8Array;
}

export const useEncrypt = () => {
  const { instance, isInitialized } = useFhevm();
  const { user } = usePrivy();
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const encrypt64 = useCallback(
    async (value: bigint): Promise<EncryptedData> => {
      if (!isInitialized || !instance) {
        throw new Error("FHEVM not initialized");
      }

      const userAddress = user?.wallet?.address;
      if (!userAddress) {
        throw new Error("Wallet not connected");
      }

      setIsEncrypting(true);
      setError(null);

      try {
        const MAX_UINT64 = BigInt("18446744073709551615");
        if (value < 0n || value > MAX_UINT64) {
          throw new Error(`Value out of range for uint64: ${value}`);
        }

        const input = instance.createEncryptedInput(
          CONTRACT_ADDRESS,
          userAddress
        );

        console.log(`Contract: ${CONTRACT_ADDRESS}`);
        console.log(`User: ${userAddress}`);
        console.log(`Encrypting value (Wei): ${value.toString()}`);

        input.add64(value);

        const encryptedInput = await input.encrypt();

        console.log(`encryptedInput: ${encryptedInput}`);

        if (!encryptedInput.handles?.[0] || !encryptedInput.inputProof) {
          throw new Error("Invalid encryption result");
        }

        console.log("✅ Encryption successful");

        return {
          encryptedData: encryptedInput.handles[0],
          proof: encryptedInput.inputProof,
        };
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Encryption failed";
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setIsEncrypting(false);
      }
    },
    [instance, isInitialized, user]
  );

  return { encrypt64, isEncrypting, error };
};
