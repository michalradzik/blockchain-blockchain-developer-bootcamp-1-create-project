const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DexAggregator", function () {
  let aggregator, dex1, dex2;
  let deployer;

  before(async function () {
    [deployer] = await ethers.getSigners();

    // Deploy MockDEX1
    const MockDEX1 = await ethers.getContractFactory("MockDEX1");
    dex1 = await MockDEX1.deploy();
    await dex1.deployed();

    // Deploy MockDEX2
    const MockDEX2 = await ethers.getContractFactory("MockDEX2");
    dex2 = await MockDEX2.deploy();
    await dex2.deployed();

    // Deploy DexAggregator with MockDEX addresses
    const DexAggregator = await ethers.getContractFactory("DexAggregator");
    aggregator = await DexAggregator.deploy([dex1.address, dex2.address], 50, 30, 20); // wagi domyślne
    await aggregator.deployed();
  });

  it("Should deploy the contracts successfully", async function () {
    expect(aggregator.address).to.properAddress;
    expect(dex1.address).to.properAddress;
    expect(dex2.address).to.properAddress;
  });

  it("Should return the best DEX based on price priority", async function () {
    const amountIn = ethers.utils.parseUnits("1000", "wei"); // Symulowana kwota wejściowa

    // Zmieniamy wagi, aby priorytet miała cena
    await aggregator.setWeights(70, 20, 10);

    const [bestDex, bestScore] = await aggregator.findBestDex(amountIn, ethers.constants.AddressZero, ethers.constants.AddressZero);
    
    expect(bestDex).to.equal(dex1.address); // dex1 powinien być lepszy, bo ma lepszy kurs
    console.log("Best DEX (Price Priority):", bestDex, "Score:", bestScore.toString());
  });

  it("Should return the best DEX based on fee priority", async function () {
    const amountIn = ethers.utils.parseUnits("1000", "wei");

    // Ustawiamy wagi, aby priorytet miały opłaty
    await aggregator.setWeights(30, 50, 20);

    const [bestDex, bestScore] = await aggregator.findBestDex(amountIn, ethers.constants.AddressZero, ethers.constants.AddressZero);

    expect(bestDex).to.equal(dex2.address); // dex2 powinien być lepszy, bo ma niższą opłatę
    console.log("Best DEX (Fee Priority):", bestDex, "Score:", bestScore.toString());
  });

  it("Should return the best DEX based on liquidity priority", async function () {
    const amountIn = ethers.utils.parseUnits("1000", "wei");

    // Ustawiamy wagi, aby priorytet miała płynność
    await aggregator.setWeights(30, 20, 50);

    const [bestDex, bestScore] = await aggregator.findBestDex(amountIn, ethers.constants.AddressZero, ethers.constants.AddressZero);

    expect(bestDex).to.equal(dex2.address); // dex2 powinien być lepszy, bo ma wyższą płynność
    console.log("Best DEX (Liquidity Priority):", bestDex, "Score:", bestScore.toString());
  });
});
