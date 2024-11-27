const { ethers } = require("hardhat");

async function testNetwork() {
    const provider = new ethers.providers.JsonRpcProvider(`https://worldchain-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);
    const network = await provider.getNetwork();
    console.log("Connected to network:", network);
}

testNetwork().catch((err) => console.error("Network error:", err));
