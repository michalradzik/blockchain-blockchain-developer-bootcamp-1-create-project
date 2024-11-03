require("@nomicfoundation/hardhat-toolbox")

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
    localhost: {
      url: "http://127.0.0.1:8545",
      gas: "auto",
      gasPrice: "auto",
    },
    localhost2: {
      url: "http://127.0.0.1:8546",  // Druga sieć localhost
      gas: "auto",
      gasPrice: "auto",
    },
    hardhat: {
      blockGasLimit: 12000000,  // Wyższy limit gazu na blok
    }
  }
};
