'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initializeFhevm } from '../lib/fhevm/init';
import { FhevmInstance } from '@zama-fhe/relayer-sdk/web';

interface FhevmContextType {
  instance: FhevmInstance | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
}

const FhevmContext = createContext<FhevmContextType | null>(null);

export const useFhevm = () => {
  const context = useContext(FhevmContext);
  if (!context) {
    throw new Error('useFhevm must be used within FhevmProvider');
  }
  return context;
};

interface FhevmProviderProps {
  children: ReactNode;
}

export const FhevmProvider = ({ children }: FhevmProviderProps) => {
  const [instance, setInstance] = useState<FhevmInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log('🚀 FhevmProvider mounted - starting initialization');

    const init = async () => {
      try {
        console.log('🔄 Calling initializeFhevm...');
        const fhevmInstance = await initializeFhevm();
        setInstance(fhevmInstance);
        console.log('✅ FHEVM instance set in context');
      } catch (err) {
        console.error('❌ Failed to initialize FHEVM in context:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
        console.log('🏁 Initialization process complete');
      }
    };

    init();
  }, []);

  return (
    <FhevmContext.Provider
      value={{
        instance,
        isInitialized: instance !== null,
        isLoading,
        error
      }}
    >
      {children}
    </FhevmContext.Provider>
  );
};