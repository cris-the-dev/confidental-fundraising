/**
 * Confidential Fundraising - Hardhat Configuration
 *
 * @author cristhedev
 * @email tiennln.work@gmail.com
 * @github https://github.com/cris-the-dev
 * @repository https://github.com/cris-the-dev/confidental-fundraising
 */

import { HardhatUserConfig, vars } from "hardhat/config.js";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "hardhat-deploy";

// Get environment variables (use hardhat vars for security)
const MNEMONIC = vars.get("MNEMONIC", "test test test test test test test test test test test junk");
const INFURA_API_KEY = vars.get("INFURA_API_KEY", "");
const ETHERSCAN_API_KEY = vars.get("ETHERSCAN_API_KEY", "");

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      evmVersion: "cancun", // FHEVM requires cancun
    },
  },
  
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: INFURA_API_KEY 
        ? `https://sepolia.infura.io/v3/${INFURA_API_KEY}`
        : "https://ethereum-sepolia-rpc.publicnode.com", // Free public RPC
      accounts: {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 10,
      },
      chainId: 11155111,
      gasPrice: "auto",
      timeout: 60000, // Increase timeout for public RPCs
    },
  },
  
  namedAccounts: {
    deployer: {
      default: 0, // First account from mnemonic
    },
  },
  
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    deploy: "./deploy",
  },
  
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY,
    },
  },
  
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
  
  // Gas reporter configuration
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
  },
};

export default config;