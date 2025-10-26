import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("\n========================================");
  console.log("🚀 STARTING DEPLOYMENT PROCESS");
  console.log("========================================");
  console.log("Network:", network.name);
  console.log("Deployer address:", deployer);
  console.log("========================================\n");

  // Step 1: Deploy ShareVault
  console.log("\n📦 [1/2] Deploying ShareVault...");
  const shareVaultDeployment = await deploy("ShareVault", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: network.name === "sepolia" ? 5 : 1,
  });

  console.log("\n✅ ShareVault deployed!");
  console.log("Address:", shareVaultDeployment.address);
  console.log("Gas used:", shareVaultDeployment.receipt?.gasUsed?.toString());

  // Step 2: Deploy ConfidentialFundraising with ShareVault address
  console.log("\n📦 [2/2] Deploying ConfidentialFundraising...");
  const fundraisingDeployment = await deploy("ConfidentialFundraising", {
    from: deployer,
    args: [shareVaultDeployment.address],
    log: true,
    waitConfirmations: network.name === "sepolia" ? 5 : 1,
  });

  console.log("\n✅ ConfidentialFundraising deployed!");
  console.log("Address:", fundraisingDeployment.address);
  console.log("Gas used:", fundraisingDeployment.receipt?.gasUsed?.toString());

  // Step 3: Set campaign contract in ShareVault
  console.log("\n⚙️ [3/3] Setting campaign contract in ShareVault...");
  const shareVault = await ethers.getContractAt("ShareVault", shareVaultDeployment.address);
  const tx = await shareVault.setCampaignContract(fundraisingDeployment.address);
  await tx.wait();
  console.log("✅ Campaign contract set successfully!");

  // Verify contracts on Etherscan if on sepolia
  if (network.name === "sepolia" && (shareVaultDeployment.newlyDeployed || fundraisingDeployment.newlyDeployed)) {
    console.log("\n⏳ Waiting 30 seconds before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Verify ShareVault
    if (shareVaultDeployment.newlyDeployed) {
      try {
        console.log("\n🔍 Verifying ShareVault on Etherscan...");
        await hre.run("verify:verify", {
          address: shareVaultDeployment.address,
          constructorArguments: [],
        });
        console.log("✅ ShareVault verified successfully!");
      } catch (error: any) {
        if (error.message.includes("Already Verified")) {
          console.log("ℹ️ ShareVault already verified!");
        } else {
          console.log("⚠️ ShareVault verification failed:", error.message);
          console.log("You can verify manually later with:");
          console.log(`npx hardhat verify --network sepolia ${shareVaultDeployment.address}`);
        }
      }
    }

    // Verify ConfidentialFundraising
    if (fundraisingDeployment.newlyDeployed) {
      try {
        console.log("\n🔍 Verifying ConfidentialFundraising on Etherscan...");
        await hre.run("verify:verify", {
          address: fundraisingDeployment.address,
          constructorArguments: [shareVaultDeployment.address],
        });
        console.log("✅ ConfidentialFundraising verified successfully!");
      } catch (error: any) {
        if (error.message.includes("Already Verified")) {
          console.log("ℹ️ ConfidentialFundraising already verified!");
        } else {
          console.log("⚠️ ConfidentialFundraising verification failed:", error.message);
          console.log("You can verify manually later with:");
          console.log(`npx hardhat verify --network sepolia ${fundraisingDeployment.address} ${shareVaultDeployment.address}`);
        }
      }
    }
  }

  // Save deployment info to frontend
  const fs = require("fs");
  const path = require("path");

  const deploymentInfo = {
    ConfidentialFundraising: {
      address: fundraisingDeployment.address,
      transactionHash: fundraisingDeployment.transactionHash,
    },
    ShareVault: {
      address: shareVaultDeployment.address,
      transactionHash: shareVaultDeployment.transactionHash,
    },
    network: network.name,
    chainId: network.config.chainId,
    deployedAt: new Date().toISOString(),
  };

  const frontendDir = path.join(__dirname, "../fundraising-frontend/src/contracts");

  try {
    if (!fs.existsSync(frontendDir)) {
      fs.mkdirSync(frontendDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(frontendDir, "deployment.json"),
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n✅ Deployment info saved to fundraising-frontend/src/contracts/deployment.json");
  } catch (error) {
    console.log("⚠️ Could not save deployment info to frontend (this is OK if frontend isn't set up yet)");
  }

  // Copy contract ABIs to frontend
  try {
    const artifactsDir = path.join(__dirname, "../artifacts/contracts");
    const abiDir = path.join(frontendDir, "abi");

    if (!fs.existsSync(abiDir)) {
      fs.mkdirSync(abiDir, { recursive: true });
    }

    // Copy ConfidentialFundraising ABI
    const fundraisingArtifact = JSON.parse(
      fs.readFileSync(path.join(artifactsDir, "ConfidentialFundraising.sol/ConfidentialFundraising.json"), "utf8")
    );
    fs.writeFileSync(
      path.join(abiDir, "ConfidentialFundraising.json"),
      JSON.stringify(fundraisingArtifact.abi, null, 2)
    );

    // Copy ShareVault ABI
    const shareVaultArtifact = JSON.parse(
      fs.readFileSync(path.join(artifactsDir, "ShareVault.sol/ShareVault.json"), "utf8")
    );
    fs.writeFileSync(
      path.join(abiDir, "ShareVault.json"),
      JSON.stringify(shareVaultArtifact.abi, null, 2)
    );

    console.log("✅ Contract ABIs copied to frontend");
  } catch (error) {
    console.log("⚠️ Could not copy ABIs to frontend (this is OK if frontend isn't set up yet)");
  }

  // Update frontend .env.local if it exists
  try {
    const envPath = path.join(__dirname, "../fundraising-frontend/.env.local");

    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, "utf8");

      // Update contract addresses
      envContent = envContent.replace(
        /NEXT_PUBLIC_CONTRACT_ADDRESS=.*/,
        `NEXT_PUBLIC_CONTRACT_ADDRESS=${fundraisingDeployment.address}`
      );
      envContent = envContent.replace(
        /NEXT_PUBLIC_VAULT_ADDRESS=.*/,
        `NEXT_PUBLIC_VAULT_ADDRESS=${shareVaultDeployment.address}`
      );

      fs.writeFileSync(envPath, envContent);
      console.log("✅ Frontend .env.local updated with contract addresses");
    }
  } catch (error) {
    console.log("⚠️ Could not update frontend .env.local (this is OK if it doesn't exist yet)");
  }

  console.log("\n========================================");
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("========================================");
  console.log("\n📋 Deployment Summary:");
  console.log("├─ ShareVault:", shareVaultDeployment.address);
  console.log("└─ ConfidentialFundraising:", fundraisingDeployment.address);
  console.log("\n📝 Next steps:");
  console.log("1. Contract addresses have been automatically updated in .env.local");
  console.log("2. Start the frontend: cd fundraising-frontend && npm run dev");
  console.log("3. Open: http://localhost:3000");
  console.log("========================================\n");
};

func.tags = ["ConfidentialFundraising"];
export default func;