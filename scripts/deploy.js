const hre = require("hardhat");
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
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

    const dexesPath = path.join(__dirname, '../tmp/dexes.json');
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
    const baseAmount = 100; // Bazowa ilość tokenów
    console.log("Base liquidity amount in tokens:", baseAmount);
    const deployedAmmAddresses = []; // Przechowywanie adresów AMM

    for (let i = 0; i < 3; i++) {
        const token1 = tokenAddresses[0];
        const token2 = tokenAddresses[1];

        console.log(`Deploying AMM contract ${i + 1} with token1: ${token1.address} and token2: ${token2.address}`);
        const amm = await AMM.deploy(token1.address, token2.address);
        await amm.deployed();

        const ammAddress = amm.address;
        deployedAmmAddresses.push(ammAddress);
        console.log(`AMM contract ${i + 1} deployed to: ${ammAddress}`);

        // Generowanie losowej płynności w przedziale ±10%
        const minAmount = baseAmount * 0.9;
        const maxAmount = baseAmount * 1.1;
        const randomAmountToken1 = tokens((Math.random() * (maxAmount - minAmount) + minAmount).toFixed(2));
        const randomAmountToken2 = tokens((Math.random() * (maxAmount - minAmount) + minAmount).toFixed(2));

        console.log(`Random liquidity amounts for AMM_${i + 1}:`);
        console.log("Token1 amount:", formatUnits(randomAmountToken1, 18));
        console.log("Token2 amount:", formatUnits(randomAmountToken2, 18));

        // Generowanie losowych opłat
        const makerFee = parseFloat((Math.random() * (0.015 - 0.005) + 0.005).toFixed(4));
        const takerFee = parseFloat((Math.random() * (0.03 - 0.01) + 0.01).toFixed(4));

        console.log(`Random fees for AMM_${i + 1}:`);
        console.log("Maker fee:", makerFee);
        console.log("Taker fee:", takerFee);

        console.log("Approving tokens for initial liquidity...");
        await deployedTokens["DAPP"].connect(deployer).approve(ammAddress, randomAmountToken1);
        await deployedTokens["USD"].connect(deployer).approve(ammAddress, randomAmountToken2);
        console.log("Token approvals completed for initial liquidity.");

        console.log(`Adding liquidity to AMM_${i + 1} by deployer...`);
        try {
            let tx = await amm.connect(deployer).addLiquidity(randomAmountToken1, randomAmountToken2, {
                gasLimit: 3000000 // lub inna odpowiednia wartość
            });
            await tx.wait();
            console.log(`Liquidity successfully added to AMM_${i + 1} by deployer.`);

            // Log shares for the deployer account
            const shares = await amm.shares(deployer.address);
            console.log(`Shares for deployer (${deployer.address}) in AMM_${i + 1}:`, formatUnits(shares, 18));
        } catch (error) {
            console.error(`Error adding initial liquidity to AMM_${i + 1}:`, error);
            continue; // Przejdź do następnego AMM w razie błędu
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
                token1: formatUnits(randomAmountToken1, 18),
                token2: formatUnits(randomAmountToken2, 18)
            },
            fee: {
                maker: makerFee,
                taker: takerFee
            },
            swaps: [] // Dodano pole swaps
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
        addresses: deployedAmmAddresses
    };

    // Save changes to config.json file
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`config.json updated with token addresses:`, tokenAddresses);

    // Run server.js after deployment
    console.log("Starting server.js...");
    const serverPath = path.join(__dirname, '../server.js');

    const serverProcess = exec(`node ${serverPath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error starting server.js: ${error}`);
            return;
        }
        console.log(`server.js output: ${stdout}`);
        console.error(`server.js errors: ${stderr}`);
    });

    serverProcess.on('close', (code) => {
        console.log(`server.js process exited with code ${code}`);
    });
}

main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
});
