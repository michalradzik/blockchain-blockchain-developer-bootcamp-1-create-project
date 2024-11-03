// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./AMM.sol";  // Import kontraktu AMM
import "hardhat/console.sol";

contract DexAggregator2 {
    address[] public dexes;

    event BestDexSelected(address indexed bestDex, uint256 bestScore);
    event SwapExecuted(address indexed dex, uint256 amountIn, address tokenIn, address tokenOut, uint256 amountOut);

    struct DexData {
        uint256 amountOut;
        uint256 fee;
        uint256 liquidity;
        uint256 priceWeight;
        uint256 feeWeight;
        uint256 liquidityWeight;
    }

    constructor(address[] memory _dexes) {
        dexes = _dexes;
    }

    function calculateScore(DexData memory dexData) internal pure returns (uint256) {
        return (dexData.amountOut * dexData.priceWeight / 100) 
                - (dexData.fee * dexData.feeWeight / 100) 
                + (dexData.liquidity * dexData.liquidityWeight / 100);
    }

    function findBestDex(
        uint256 amountIn, 
        address tokenIn, 
        address tokenOut, 
        uint256 priceWeight, 
        uint256 feeWeight, 
        uint256 liquidityWeight
    ) public view returns (address, uint256) {
        require(priceWeight + feeWeight + liquidityWeight == 100, "Wagi musza sumowac sie do 100");

        uint256 bestScore = 0;
        address bestDex = address(0);

        for (uint256 i = 0; i < dexes.length; i++) {
            AMM dex = AMM(dexes[i]);  // Zakładamy, że każdy DEX to instancja AMM

            uint256 amountOut;
            uint256 liquidity;

            // Sprawdzenie, czy tokenIn to token1
            if (tokenIn == address(dex.token1())) {
                amountOut = dex.calculateToken1Swap(amountIn);
                liquidity = dex.token1Balance();  // Płynność token1
            } else if (tokenIn == address(dex.token2())) {
                amountOut = dex.calculateToken2Swap(amountIn);
                liquidity = dex.token2Balance();  // Płynność token2
            } else {
                continue;  // Jeśli token nie pasuje do tokenów DEXa, przejdź do kolejnego
            }

            if (liquidity < amountIn) continue;

            uint256 score = (amountOut * priceWeight / 100) + (liquidity * liquidityWeight / 100);
            if (score > bestScore) {
                bestScore = score;
                bestDex = dexes[i];
            }
        }

        require(bestDex != address(0), "Nie znaleziono odpowiedniego DEXu");
        return (bestDex, bestScore);
    }

    function swapOnBestDex(
        address bestDex,
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) external payable returns (uint256 amountOut) {
        require(bestDex != address(0), "Invalid DEX address");

        AMM dex = AMM(bestDex);

        if (tokenIn == address(dex.token1())) {
            // Swap token1 na token2
            amountOut = dex.swapToken1(amountIn);
        } else if (tokenIn == address(dex.token2())) {
            // Swap token2 na token1
            amountOut = dex.swapToken2(amountIn);
        } else {
            revert("Unsupported token for swap");
        }

        emit SwapExecuted(bestDex, amountIn, tokenIn, tokenOut, amountOut);
    }

    fallback() external payable {
        // Obsługa przesyłania ETH w fallback
    }

    receive() external payable {
        // Obsługa przesyłania ETH w receive
    }
}
