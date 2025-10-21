import { createInstance, initFhevm, FhevmInstance } from 'fhevmjs';
import { JsonRpcProvider } from 'ethers';

let fhevmInstance: FhevmInstance | null = null;
let isInitialized = false;

export const initializeFhevm = async (): Promise<FhevmInstance> => {
  if (isInitialized && fhevmInstance) {
    return fhevmInstance;
  }

  try {
    console.log('🔐 Initializing FHEVM...');
    
    // Initialize FHEVM - library will auto-detect WASM files
    await initFhevm();
    
    const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '11155111');
    const aclAddress = process.env.NEXT_PUBLIC_ACL_ADDRESS!;
    const kmsAddress = process.env.NEXT_PUBLIC_KMS_ADDRESS!;
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL!;
    const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL!;
    
    console.log('📡 Fetching public key from ACL contract...');
    const publicKeyHex = await getPublicKey(rpcUrl, aclAddress);
    
    // Convert hex string to Uint8Array
    const publicKey = hexToUint8Array(publicKeyHex);
    
    console.log('🔨 Creating FHEVM instance...');
    console.log('  - Chain ID:', chainId);
    console.log('  - ACL Address:', aclAddress);
    console.log('  - Gateway URL:', gatewayUrl);
    
    // Create the FHEVM instance
    fhevmInstance = await createInstance({
      chainId,
      publicKey,
      gatewayUrl,
      aclContractAddress: aclAddress,
      kmsContractAddress: kmsAddress
    });
    
    isInitialized = true;
    console.log('✅ FHEVM initialized successfully');
    
    return fhevmInstance;
  } catch (error) {
    console.error('❌ Failed to initialize FHEVM:', error);
    throw error;
  }
};

export const getPublicKey = async (
  rpcUrl: string,
  aclAddress: string
): Promise<string> => {
  try {
    const provider = new JsonRpcProvider(rpcUrl);
    
    // Verify ACL contract exists
    const code = await provider.getCode(aclAddress);
    if (code === '0x' || code === '0x0') {
      throw new Error(`ACL contract not found at ${aclAddress}`);
    }

    // Call getPublicKey() function on ACL contract
    const publicKeyHex = await provider.call({
      to: aclAddress,
      data: '0x0d4743cb', // getPublicKey() selector
    });

    if (!publicKeyHex || publicKeyHex === '0x') {
      throw new Error('Failed to fetch public key from ACL contract');
    }

    // Clean up the public key
    let cleanKey = publicKeyHex.slice(2);
    
    // Remove leading zeros if any
    while (cleanKey.startsWith('00') && cleanKey.length > 2) {
      cleanKey = cleanKey.slice(2);
    }

    const finalKey = '0x' + cleanKey;
    console.log('🔑 Public key fetched:', finalKey.slice(0, 20) + '...');
    
    return finalKey;
  } catch (error) {
    console.error('Error fetching public key:', error);
    throw error;
  }
};

// Helper function to convert hex string to Uint8Array
const hexToUint8Array = (hexString: string): Uint8Array => {
  // Remove '0x' prefix if present
  const hex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
  
  // Convert hex string to Uint8Array
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  
  return bytes;
};

export const getFhevmInstance = async (): Promise<FhevmInstance> => {
  if (!fhevmInstance) {
    return await initializeFhevm();
  }
  return fhevmInstance;
};