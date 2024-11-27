require("@nomicfoundation/hardhat-toolbox")

require("@nomicfoundation/hardhat-chai-matchers");
require("dotenv").config();

const { PRIVATE_KEYS, ALCHEMY_API_KEY, ETHERSCAN_API_KEY } = process.env;
const privateKeys = process.env.PRIVATE_KEYS || ""
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.9",  // Pierwsza wersja Solidity
      },
      {
        version: "0.8.0",  // Druga wersja Solidity
      },
      {
        version: "0.8.20",  // Druga wersja Solidity
      }
    ],
  },
  networks: {
    WorldChainSepoliaTestnet: {
    url: `https://worldchain-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    accounts: privateKeys.split(",")
  }
  }
};
