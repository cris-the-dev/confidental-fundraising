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
        // ✅ Validate against uint64 range
        const MAX_UINT64 = BigInt("18446744073709551615");
        if (value < 0n || value > MAX_UINT64) {
          throw new Error(`Value out of range for uint64`);
        }

        // Create encrypted input
        const input = instance.createEncryptedInput(
          CONTRACT_ADDRESS,
          userAddress
        );

        console.log(`CA: ${CONTRACT_ADDRESS}`);
        console.log(`userAddress: ${userAddress}`);
        console.log(`value: ${value}`);
        
        
        // Add value (safe after validation)
        input.add64(Number(value));
        
        // Perform encryption
        const encryptedInput = await input.encrypt();

        if (!encryptedInput.handles?.[0] || !encryptedInput.inputProof) {
          throw new Error('Invalid encryption result');
        }

        // ✅ Return raw Uint8Array - NO hex conversion
        return {
          encryptedData: encryptedInput.handles[0],
          proof: encryptedInput.inputProof,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Encryption failed";
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