import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("\n========================================");
  console.log("Deploying ConfidentialFundraising contract...");
  console.log("========================================");
  console.log("Network:", network.name);
  console.log("Deployer address:", deployer);
  console.log("========================================\n");

  const deployment = await deploy("ConfidentialFundraising", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: network.name === "sepolia" ? 5 : 1,
  });

  console.log("\n========================================");
  console.log("✅ ConfidentialFundraising deployed!");
  console.log("========================================");
  console.log("Contract address:", deployment.address);
  console.log("Transaction hash:", deployment.transactionHash);
  console.log("Gas used:", deployment.receipt?.gasUsed?.toString());
  console.log("========================================\n");

  // Verify contract on Etherscan if not on localhost
  if (network.name === "sepolia" && deployment.newlyDeployed) {
    console.log("Waiting 30 seconds before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    try {
      console.log("Verifying contract on Etherscan...");
      await hre.run("verify:verify", {
        address: deployment.address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("ℹ️ Contract already verified!");
      } else {
        console.log("⚠️ Verification failed:", error.message);
        console.log("You can verify manually later with:");
        console.log(`npx hardhat verify --network sepolia ${deployment.address}`);
      }
    }
  }

  // Save deployment info to frontend
  const fs = require("fs");
  const path = require("path");
  
  const deploymentInfo = {
    address: deployment.address,
    network: network.name,
    chainId: network.config.chainId,
    deployedAt: new Date().toISOString(),
    transactionHash: deployment.transactionHash,
  };

  const frontendDir = path.join(__dirname, "../frontend/src/contracts");
  
  try {
    if (!fs.existsSync(frontendDir)) {
      fs.mkdirSync(frontendDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(frontendDir, "deployment.json"),
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n✅ Deployment info saved to frontend/src/contracts/deployment.json");
  } catch (error) {
    console.log("⚠️ Could not save deployment info to frontend (this is OK if frontend isn't set up yet)");
  }

  console.log("\n========================================");
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("========================================");
  console.log("Next steps:");
  console.log("1. Update frontend/.env with contract address:");
  console.log(`   VITE_CONTRACT_ADDRESS=${deployment.address}`);
  console.log("2. Update frontend/src/contracts/config.ts");
  console.log("3. Start the frontend: cd frontend && npm run dev");
  console.log("========================================\n");
};

func.tags = ["ConfidentialFundraising"];
export default func;