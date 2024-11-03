const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
const { ethers } = require("hardhat");
const { parseUnits, formatUnits } = ethers.utils;

const tokens = (n) => parseUnits(n.toString(), 'ether');

async function main() {
    console.log("Starting deployment...");

    const accounts = await ethers.getSigners();
    const deployer = accounts[0];

    console.log("Deploying contracts with the account:", deployer.address);
    const chainId = (await deployer.provider.getNetwork()).chainId;
    console.log("Chain ID:", chainId);

    const dexesPath = path.join(__dirname, '../src/dexes.json');
    if (fs.existsSync(dexesPath)) {
        fs.unlinkSync(dexesPath);
        console.log("Existing dexes.json file removed.");
    }

    const tokenDetails = [
        { name: "Dapp Token", symbol: "DAPP", supply: tokens(10000) },
        { name: "USD Token", symbol: "USD", supply: tokens(10000) }
    ];

    let deployedTokens = {};
    let tokenAddresses = [];

    for (let { name, symbol, supply } of tokenDetails) {
        console.log(`Deploying ${name} (${symbol})...`);
        const Token = await ethers.getContractFactory("Token");
        const token = await Token.deploy(name, symbol, supply);
        await token.deployed();
        console.log(`${symbol} deployed to:`, token.address);

        deployedTokens[symbol] = token;
        tokenAddresses.push({ address: token.address, symbol });
    }

    console.log("Deploying AMM contracts...");
    const AMM = await ethers.getContractFactory("AMM");
    let dexesData = [];
    const amount = tokens(100);
    console.log("Initial liquidity amount in tokens:", formatUnits(amount, 18));
    const deployedAmmAddresses = []; // To store AMM addresses

    for (let i = 0; i < 3; i++) {
        const token1 = tokenAddresses[0];
        const token2 = tokenAddresses[1];

        console.log(`Deploying AMM contract ${i + 1} with token1: ${token1.address} and token2: ${token2.address}`);
        const amm = await AMM.deploy(token1.address, token2.address);
        await amm.deployed();

        const ammAddress = amm.address;
        deployedAmmAddresses.push(ammAddress); // Add AMM address to the list
        console.log(`AMM contract ${i + 1} deployed to: ${ammAddress}`);

        console.log("Approving tokens for initial liquidity...");
        await deployedTokens["DAPP"].connect(deployer).approve(ammAddress, amount);
        await deployedTokens["USD"].connect(deployer).approve(ammAddress, amount);
        console.log("Token approvals completed for initial liquidity.");

        console.log(`Adding liquidity to AMM_${i + 1} by deployer...`);
        try {
            let tx = await amm.connect(deployer).addLiquidity(amount, amount);
            await tx.wait();
            console.log(`Liquidity successfully added to AMM_${i + 1} by deployer.`);

            // Log shares for the deployer account
            const shares = await amm.shares(deployer.address);
            console.log(`Shares for deployer (${deployer.address}) in AMM_${i + 1}:`, formatUnits(shares, 18));
        } catch (error) {
            console.error(`Error adding initial liquidity to AMM_${i + 1}:`, error);
            continue; // Move to the next AMM if liquidity addition fails
        }

        dexesData.push({
            name: `AMM_${i + 1}`,
            ammAddress,
            tokenIn: token1.address,
            tokenInSymbol: token1.symbol,
            tokenOut: token2.address,
            tokenOutSymbol: token2.symbol,
            price: parseFloat((Math.random() * (1.5 - 0.9) + 0.9).toFixed(2)),
            liquidity: {
                token1: formatUnits(amount, 18),
                token2: formatUnits(amount, 18)
            },
            fee: {
                maker: 0.01,
                taker: 0.02
            }
        });
    }

    fs.writeFileSync(dexesPath, JSON.stringify(dexesData, null, 2));
    console.log("dexes.json file created with deployed DEX data.");

    // Update config.json file
    const configPath = path.join(__dirname, '../src/config.json');
    let config = {};

    if (fs.existsSync(configPath)) {
        const configFile = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(configFile);
    }

    // Add token data to config.json
    if (!config[chainId]) {
        config[chainId] = {};
    }

    config[chainId]['dapp'] = { address: tokenAddresses[0].address };
    config[chainId]['usd'] = { address: tokenAddresses[1].address };

    // Add AMM addresses to config.json
    config[chainId]['amm'] = {
        addresses: deployedAmmAddresses // Add AMM addresses
    };

    // Save changes to config.json file
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`config.json updated with token addresses:`, tokenAddresses);
}

main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
});
