const hre = require("hardhat");
const fs = require('fs');
const path = require('path');  // To handle file paths
const { parseUnits } = hre.ethers;

async function main() {
  const { ethers } = hre;
  console.log("Starting deployment...");

  const gasLimit = 8000000;  // Set a higher gas limit
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const tokenDetails = [
    { name: "Ethereum", symbol: "ETH", supply: parseUnits("1000000", 18) },
    { name: "Dai Stablecoin", symbol: "DAI", supply: parseUnits("5000000", 18) },
    { name: "USD Coin", symbol: "USDC", supply: parseUnits("3000000", 6) }
  ];

  let deployedTokens = {};
  let tokenInAddress = [];

  // Deploy multiple tokens and update the tokenInAddress array
  for (let i = 0; i < tokenDetails.length; i++) {
    const { name, symbol, supply } = tokenDetails[i];
    console.log(`Deploying ${name} (${symbol})...`);

    const Token = await ethers.getContractFactory("Token");
    const token = await Token.deploy(name, symbol, supply);
    await token.waitForDeployment();

    const tokenAddress = token.target;
    console.log(`${symbol} deployed to:`, tokenAddress);

    // Store deployed token addresses
    deployedTokens[symbol] = tokenAddress;
    tokenInAddress.push(tokenAddress);
  }

  // Now deploy the MockDEX1 contract using the tokenInAddress array for dynamic token input
  const mockDEXDetails = {
    slippageRate: 95,
    fee: 2,
    liquidity: 10000
  };

  console.log("Deploying MockDEX1 contract...");

  const MockDEX1 = await ethers.getContractFactory("MockDEX1");

  let dexesData = [];  // Array to hold deployed DEX data

  // Loop over token addresses to create MockDEX1 contracts
  for (let i = 0; i < tokenInAddress.length; i++) {
    const tokenOutAddress = deployedTokens["DAI"]; // For example, using DAI as tokenOut

    const mockDex = await MockDEX1.deploy(
      mockDEXDetails.slippageRate,
      mockDEXDetails.fee,
      mockDEXDetails.liquidity,
      tokenInAddress[i],  // Each tokenIn address from the deployed tokens
      tokenOutAddress,
      { gasLimit }
    );
    await mockDex.waitForDeployment();

    console.log(`MockDEX1 contract deployed with tokenIn ${tokenInAddress[i]} and tokenOut ${tokenOutAddress} to: ${mockDex.target}`);

    // Store DEX data
    dexesData.push({
      name: `MockDEX_${i + 1}`,
      dexAddress: mockDex.target,
      pools: [{
        pair: `${tokenInAddress[i]}/${tokenOutAddress}`,
        tokenIn: {
          address: tokenInAddress[i],
          symbol: "ETH", // Replace with actual symbol if necessary
          balance: 10000,
          decimals: 18
        },
        tokenOut: {
          address: tokenOutAddress,
          symbol: "DAI", // Replace with actual symbol if necessary
          balance: 20000,
          decimals: 18
        },
        price: 1,
        liquidity: mockDEXDetails.liquidity,
        slippageTolerance: mockDEXDetails.slippageRate / 100
      }],
      fee: {
        maker: mockDEXDetails.fee,
        taker: mockDEXDetails.fee + 1 // Just an example, adjust if needed
      },
      volume24h: {
        total: 50000
      }
    });
  }

  // Save the updated contract addresses to dexes.json
  const dexesPath = path.join(__dirname, '../src/dexes.json');  // Path to dexes.json in the src directory
  let dexesDataExisting = JSON.parse(fs.readFileSync(dexesPath, 'utf-8'));

  // Update the dexes.json file with deployed DEX data
  dexesDataExisting.push(...dexesData);  // Append new DEX data
  fs.writeFileSync(dexesPath, JSON.stringify(dexesDataExisting, null, 2));
  console.log("Updated dexes.json with deployed DEX data.");

  // Save the updated contract addresses to config.json
  const networkId = hre.network.config.chainId;
  const configPath = path.join(__dirname, '../src/config.json');  // Path to config.json in the src directory
  let configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  if (!configData[networkId]) {
    configData[networkId] = {};
  }

  // Update the config.json file with deployed token addresses
  configData[networkId].tokens = deployedTokens;

  fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
  console.log("Updated config.json with deployed token addresses.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

