const hre = require("hardhat");
const { ethers } = require("hardhat");
const { parseUnits } = ethers.utils;

const tokens = (n) => parseUnits(n.toString(), "ether");

async function main() {
  console.log("Starting deployment...");

  const network = hre.network.name;
  console.log(`Deploying to network: ${network}`);

  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  console.log("Deploying contracts with the account:", deployer.address);
  const chainId = (await deployer.provider.getNetwork()).chainId;
  console.log("Chain ID:", chainId);

  // Deploy DexAggregator
  console.log("Deploying DexAggregator contract...");
  const DexAggregator = await ethers.getContractFactory("DexAggregator");
  const dexAggregator = await DexAggregator.deploy();
  await dexAggregator.deployed();
  console.log("DexAggregator deployed to:", dexAggregator.address);

  // Deploy Tokens
  console.log("Deploying tokens...");
  const tokenDetails = [
    { name: "Dapp Token", symbol: "DAPP", supply: tokens(10000) },
    { name: "USD Token", symbol: "USD", supply: tokens(10000) },
  ];

  const deployedTokens = [];
  for (let { name, symbol, supply } of tokenDetails) {
    console.log(`Deploying ${name} (${symbol})...`);
    const Token = await ethers.getContractFactory("Token");
    const token = await Token.deploy(name, symbol, supply);
    await token.deployed();
    console.log(`${symbol} deployed to: ${token.address}`);

    // Add token to DexAggregator
    console.log(`Adding ${symbol} to DexAggregator...`);
    await dexAggregator.addToken(name, symbol, token.address);

    deployedTokens.push({ name, symbol, tokenAddress: token.address });
    console.log(`${symbol} added to DexAggregator.`);
  }

  // Deploy AMM contracts and add to DexAggregator
  console.log("Deploying AMM contracts...");
  const AMM = await ethers.getContractFactory("AMM");
  const baseAmount = 100; // Base liquidity in tokens

  for (let i = 0; i < 3; i++) {
    const token1 = deployedTokens[0];
    const token2 = deployedTokens[1];

    console.log(`Deploying AMM contract ${i + 1} with token1: ${token1.tokenAddress} and token2: ${token2.tokenAddress}`);
    const amm = await AMM.deploy(token1.tokenAddress, token2.tokenAddress);
    await amm.deployed();

    const ammAddress = amm.address;
    console.log(`AMM contract ${i + 1} deployed to: ${ammAddress}`);

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

    const ammName = `AMM ${i + 1}`;
    console.log(`Adding AMM_${i + 1} to DexAggregator...`);
    await dexAggregator.addDex(ammAddress, makerFee, takerFee, randomAmountToken1, randomAmountToken2, ammName);
    console.log(`AMM_${i + 1} added to DexAggregator.`);
  }

  console.log("Deployment completed successfully.");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
