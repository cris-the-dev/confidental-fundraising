"use client";

import { useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { CONTRACT_ADDRESS } from '../lib/contracts/config';
import { useFhevm } from '../contexts/FhevmContext';

interface EncryptedData {
  data: string;
  proof: `0x${string}`;
}

const toHexString = (bytes: Uint8Array): string => {
  return '0x' + Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};

export const useEncrypt = () => {
  const { instance, isInitialized } = useFhevm();
  const { user } = usePrivy();
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const encrypt64 = useCallback(async (value: bigint): Promise<EncryptedData> => {
    if (!isInitialized || !instance) {
      throw new Error('FHEVM not initialized');
    }

    const userAddress = user?.wallet?.address;
    if (!userAddress) {
      throw new Error('Wallet not connected');
    }

    setIsEncrypting(true);
    setError(null);

    try {
      const input = instance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);
      input.add64(value);
      const encryptedInput = await input.encrypt();
      
      const handle = typeof encryptedInput.handles[0] === 'string' 
        ? encryptedInput.handles[0]
        : toHexString(encryptedInput.handles[0]);
      
      const proof = typeof encryptedInput.inputProof === 'string'
        ? encryptedInput.inputProof as `0x${string}`
        : toHexString(encryptedInput.inputProof) as `0x${string}`;
      
      return {
        data: handle,
        proof: proof,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Encryption failed';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setIsEncrypting(false);
    }
  }, [instance, isInitialized, user]);

  return { encrypt64, isEncrypting, error };
};