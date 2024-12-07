require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-chai-matchers");
require("dotenv").config();

const privateKeys = process.env.PRIVATE_KEYS || "";

module.exports = {
  defaultNetwork: "WorldChainSepoliaTestnet",
  solidity: {
    compilers: [
      {
        version: "0.8.9", // Pierwsza wersja Solidity
      },
      {
        version: "0.8.0", // Druga wersja Solidity
      },
      {
        version: "0.8.20", // Trzecia wersja Solidity
      },
    ],
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      gas: "auto",
      gasPrice: "auto",
    },
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: privateKeys.split(","),
    },
    WorldChainSepoliaTestnet: {
      url: `https://worldchain-sepolia.g.alchemy.com/v2/KusgRXoHnC2eAXWAK6_4oHoBIp2s1bC-`,
      chainId: 4801,
      accounts: [
        "0x882e1c6333878f3a77df7d9ae3230328f4b0668bf051a1915f2283eb29114756",
      ],
    },
  },
};

