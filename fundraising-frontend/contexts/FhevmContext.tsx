'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { FhevmInstance } from 'fhevmjs';
import { initializeFhevm } from '../lib/fhevm/init';

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
    const init = async () => {
      try {
        console.log('🔄 Initializing FHEVM...');
        const fhevmInstance = await initializeFhevm();
        setInstance(fhevmInstance);
        console.log('✅ FHEVM initialized successfully');
      } catch (err) {
        console.error('❌ Failed to initialize FHEVM:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
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