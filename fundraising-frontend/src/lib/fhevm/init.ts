import { createInstance, FhevmInstance, initFhevm } from "fhevmjs";

let fhevmInstance: FhevmInstance | null = null;
let initializationPromise: Promise<FhevmInstance> | null = null;

export const initializeFhevm = async (): Promise<FhevmInstance> => {
  if (fhevmInstance) {
    return fhevmInstance;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      console.log("🔐 Initializing FHEVM...");

      await initFhevm();

      const instance = await createInstance({
        chainId: Number(import.meta.env.VITE_CHAIN_ID),
        networkUrl: import.meta.env.VITE_RPC_URL,
        gatewayUrl: import.meta.env.VITE_GATEWAY_URL,
        aclAddress: import.meta.env.VITE_ACL_ADDRESS,
      });

      fhevmInstance = instance;
      console.log("✅ FHEVM initialized successfully");

      return instance;
    } catch (error) {
      console.error("❌ FHEVM initialization failed:", error);
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
};

export const getFhevmInstance = async (): Promise<FhevmInstance> => {
  if (!fhevmInstance) {
    return await initializeFhevm();
  }
  return fhevmInstance;
};
