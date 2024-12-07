// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract DexAggregator {
    struct Token {
        string name;
        string symbol;
        address tokenAddress;
    }

    struct Dex {
        address ammAddress;
        uint256 makerFee;
        uint256 takerFee;
        uint256 liquidityToken1;
        uint256 liquidityToken2;
    }

    Token[] public tokens; // Przechowywanie tokenów
    Dex[] public dexes;

    event TokenAdded(string name, string symbol, address tokenAddress);
    event DexAdded(address ammAddress, uint256 makerFee, uint256 takerFee, uint256 liquidityToken1, uint256 liquidityToken2);

    function addToken(string memory _name, string memory _symbol, address _tokenAddress) external {
        tokens.push(Token({
            name: _name,
            symbol: _symbol,
            tokenAddress: _tokenAddress
        }));
        emit TokenAdded(_name, _symbol, _tokenAddress);
    }

    function getTokens() external view returns (Token[] memory) {
        return tokens;
    }

    function addDex(
        address _ammAddress,
        uint256 _makerFee,
        uint256 _takerFee,
        uint256 _liquidityToken1,
        uint256 _liquidityToken2
    ) external {
        dexes.push(Dex({
            ammAddress: _ammAddress,
            makerFee: _makerFee,
            takerFee: _takerFee,
            liquidityToken1: _liquidityToken1,
            liquidityToken2: _liquidityToken2
        }));
        emit DexAdded(_ammAddress, _makerFee, _takerFee, _liquidityToken1, _liquidityToken2);
    }

    function getDexes() external view returns (Dex[] memory) {
        return dexes;
    }
}

contract DexAggregatorFactory {
    address public deployedDexAggregator;

    event DexAggregatorDeployed(address indexed contractAddress);

    function deployDexAggregator() external {
        DexAggregator dexAggregator = new DexAggregator();
        deployedDexAggregator = address(dexAggregator);

        emit DexAggregatorDeployed(deployedDexAggregator); // Emituj zdarzenie z adresem wdrożonego kontraktu
    }

    function getDeployedDexAggregator() external view returns (address) {
        return deployedDexAggregator;
    }
}
