const hre = require("hardhat");
const fs = require("fs");
const { ethers } = require("hardhat");
const { parseUnits } = ethers.utils;

const tokens = (n) => parseUnits(n.toString(), "ether");

const CHECKPOINT_FILE = "deployment_checkpoint.json";

function saveCheckpoint(step, data = {}) {
  const checkpoint = { step, data };
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

function loadCheckpoint() {
  if (fs.existsSync(CHECKPOINT_FILE)) {
    return JSON.parse(fs.readFileSync(CHECKPOINT_FILE));
  }
  return { step: 0, data: {} };
}

async function main() {
  console.log("Starting deployment...");

  const checkpoint = loadCheckpoint();
  let step = checkpoint.step;

  const network = hre.network.name;
  console.log(`Deploying to network: ${network}`);

  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  console.log("Deploying contracts with the account:", deployer.address);
  const chainId = (await deployer.provider.getNetwork()).chainId;
  console.log("Chain ID:", chainId);

  let registry, dexAggregatorFactory, dexAggregatorAddress, deployedTokens = [], dexAggregator;

  if (step < 1) {
    // Step 1: Deploy Registry contract
    console.log("Deploying Registry contract...");
    const Registry = await ethers.getContractFactory("Registry");
    registry = await Registry.deploy();
    await registry.deployed();
    console.log("Registry deployed to:", registry.address);
    saveCheckpoint(1, { registryAddress: registry.address });
    step = 1;
  } else {
    registry = await ethers.getContractAt("Registry", checkpoint.data.registryAddress);
  }

  if (step < 2) {
    // Step 2: Deploy DexAggregatorFactory
    console.log("Deploying DexAggregatorFactory contract...");
    const DexAggregatorFactory = await ethers.getContractFactory("DexAggregatorFactory");
    dexAggregatorFactory = await DexAggregatorFactory.deploy();
    await dexAggregatorFactory.deployed();
    console.log("DexAggregatorFactory deployed to:", dexAggregatorFactory.address);

    // Register DexAggregatorFactory in Registry
    console.log("Registering DexAggregatorFactory in Registry...");
    await registry.register("DexAggregatorFactory", dexAggregatorFactory.address);
    console.log("DexAggregatorFactory registered in Registry.");
    saveCheckpoint(2, { registryAddress: registry.address, dexAggregatorFactoryAddress: dexAggregatorFactory.address });
    step = 2;
  } else {
    dexAggregatorFactory = await ethers.getContractAt("DexAggregatorFactory", checkpoint.data.dexAggregatorFactoryAddress);
  }

  if (step < 3) {
    // Step 3: Deploy DexAggregator via Factory
    console.log("Deploying DexAggregator via Factory...");
    const tx = await dexAggregatorFactory.deployDexAggregator();
    await tx.wait();
    dexAggregatorAddress = await dexAggregatorFactory.deployedDexAggregator();
    console.log("DexAggregator deployed to:", dexAggregatorAddress);

    // Register DexAggregator in Registry
    console.log("Registering DexAggregator in Registry...");
    await registry.register("DexAggregator", dexAggregatorAddress);
    console.log("DexAggregator registered in Registry.");
    saveCheckpoint(3, { registryAddress: registry.address, dexAggregatorFactoryAddress: dexAggregatorFactory.address, dexAggregatorAddress });
    step = 3;
  } else {
    dexAggregatorAddress = checkpoint.data.dexAggregatorAddress;
  }

  dexAggregator = await ethers.getContractAt("DexAggregator", dexAggregatorAddress);

  if (step < 4) {
    // Step 4: Deploy Tokens
    console.log("Deploying tokens...");
    const tokenDetails = [
      { name: "Dapp Token", symbol: "DAPP", supply: tokens(10000) },
      { name: "USD Token", symbol: "USD", supply: tokens(10000) },
    ];

    for (let { name, symbol, supply } of tokenDetails) {
      console.log(`Deploying ${name} (${symbol})...`);
      const Token = await ethers.getContractFactory("Token");
      const token = await Token.deploy(name, symbol, supply);
      await token.deployed();
      console.log(`${symbol} deployed to: ${token.address}`);

      // Register token in Registry
      console.log(`Registering ${symbol} in Registry...`);
      await registry.registerToken("DeployedTokens", token.address);

      // Add token to DexAggregator
      console.log(`Adding ${symbol} to DexAggregator...`);
      await dexAggregator.addToken(name, symbol, token.address);

      deployedTokens.push({ name, symbol, tokenAddress: token.address });
      console.log(`${symbol} added to DexAggregator and Registry.`);
    }
    saveCheckpoint(4, { registryAddress: registry.address, dexAggregatorFactoryAddress: dexAggregatorFactory.address, dexAggregatorAddress, deployedTokens });
    step = 4;
  } else {
    deployedTokens = checkpoint.data.deployedTokens;
  }

  if (step < 5) {
    // Step 5: Deploy AMM contracts and add to DexAggregator
    console.log("Deploying AMM contracts...");
    const AMM = await ethers.getContractFactory("AMM");
    const baseAmount = 100; // Base liquidity in tokens
    const deployedAmmAddresses = [];

    for (let i = 0; i < 3; i++) {
      const token1 = deployedTokens[0];
      const token2 = deployedTokens[1];

      console.log(`Deploying AMM contract ${i + 1} with token1: ${token1.tokenAddress} and token2: ${token2.tokenAddress}`);
      const amm = await AMM.deploy(token1.tokenAddress, token2.tokenAddress);
      await amm.deployed();

      const ammAddress = amm.address;
      deployedAmmAddresses.push(ammAddress);
      console.log(`AMM contract ${i + 1} deployed to: ${ammAddress}`);

      // Register AMM in Registry
      console.log(`Registering AMM_${i + 1} in Registry...`);
      await registry.registerAMM("DeployedAMMs", ammAddress);

      // Randomize liquidity and fees
      const minAmount = baseAmount * 0.9;
      const maxAmount = baseAmount * 1.1;
      const randomAmountToken1 = tokens((Math.random() * (maxAmount - minAmount) + minAmount).toFixed(2));
      const randomAmountToken2 = tokens((Math.random() * (maxAmount - minAmount) + minAmount).toFixed(2));
      const makerFee = Math.floor((Math.random() * (0.015 - 0.005) + 0.005) * 10000); // Fee in 1/10000 scale
      const takerFee = Math.floor((Math.random() * (0.03 - 0.01) + 0.01) * 10000); // Fee in 1/10000 scale

      console.log(`Adding liquidity to AMM_${i + 1}...`);
      const dappToken = await ethers.getContractAt("Token", token1.tokenAddress);
      const usdToken = await ethers.getContractAt("Token", token2.tokenAddress);
      await dappToken.connect(deployer).approve(ammAddress, randomAmountToken1);
      await usdToken.connect(deployer).approve(ammAddress, randomAmountToken2);
      await amm.connect(deployer).addLiquidity(randomAmountToken1, randomAmountToken2);

      console.log(`Adding AMM_${i + 1} to DexAggregator...`);
      await dexAggregator.addDex(ammAddress, makerFee, takerFee, randomAmountToken1, randomAmountToken2);
      console.log(`AMM_${i + 1} added to DexAggregator.`);
    }
    saveCheckpoint(5, { registryAddress: registry.address, dexAggregatorFactoryAddress: dexAggregatorFactory.address, dexAggregatorAddress, deployedTokens, deployedAmmAddresses });
  }

  console.log("Deployment completed successfully.");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
