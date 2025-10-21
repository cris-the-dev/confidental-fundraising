import { useState, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useFhevm } from "../contexts/FhevmContext";
import { CONTRACT_ADDRESS } from "../lib/contracts/config";

interface EncryptedData {
  data: string;
  proof: `0x${string}`;
}

const toHexString = (bytes: Uint8Array): string => {
  return (
    "0x" +
    Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
  );
};

export const useEncrypt = () => {
  const { instance, isInitialized } = useFhevm();
  const { user } = usePrivy();
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const encrypt64 = useCallback(
    async (value: bigint): Promise<EncryptedData> => {
      console.log("🔐 Encrypt called - Checking initialization...");
      console.log("  - isInitialized:", isInitialized);
      console.log("  - instance:", instance ? "exists" : "null");

      if (!isInitialized || !instance) {
        const errorMsg =
          "FHEVM not initialized. Please wait for initialization to complete.";
        console.error("❌", errorMsg);
        throw new Error(errorMsg);
      }

      const userAddress = user?.wallet?.address;
      if (!userAddress) {
        throw new Error("Wallet not connected");
      }

      setIsEncrypting(true);
      setError(null);

      try {
        console.log("🔐 Encrypting value:", value.toString());
        console.log("  - Contract:", CONTRACT_ADDRESS);
        console.log("  - User:", userAddress);

        const input = instance.createEncryptedInput(
          CONTRACT_ADDRESS,
          userAddress
        );
        input.add64(value);
        const encryptedInput = await input.encrypt();

        // Convert Uint8Array to hex string if needed
        const handle =
          typeof encryptedInput.handles[0] === "string"
            ? encryptedInput.handles[0]
            : toHexString(encryptedInput.handles[0]);

        const proof =
          typeof encryptedInput.inputProof === "string"
            ? (encryptedInput.inputProof as `0x${string}`)
            : (toHexString(encryptedInput.inputProof) as `0x${string}`);

        console.log("✅ Encryption successful");
        console.log("  - Handle:", handle.slice(0, 20) + "...");
        console.log("  - Proof:", proof.slice(0, 20) + "...");

        return {
          data: handle,
          proof: proof,
        };
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Encryption failed";
        console.error("❌ Encryption error:", errorMsg);
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
