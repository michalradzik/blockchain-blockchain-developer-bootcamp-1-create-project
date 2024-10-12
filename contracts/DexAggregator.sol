// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IExchange.sol";  // Import the interface for IExchange

contract DexAggregator{
    address[] public dexes;

    // Event to log the selected best DEX
    event BestDexSelected(address indexed bestDex, uint256 bestScore);
    
    // Event to log the result of the swap
    event SwapExecuted(address indexed dex, uint256 amountIn, address tokenIn, address tokenOut, uint256 amountOut);

    // Structure to group comparison results
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



    // Function to calculate score based on dynamic weights using the structure
    function calculateScore(DexData memory dexData) internal pure returns (uint256) {
        return (dexData.amountOut * dexData.priceWeight / 100) 
                - (dexData.fee * dexData.feeWeight / 100) 
                + (dexData.liquidity * dexData.liquidityWeight / 100);
    }

    // Function to swap tokens on the best DEX
     function findBestDex(
    uint256 amountIn, 
    address tokenIn, 
    address tokenOut, 
    uint256 priceWeight, 
    uint256 feeWeight, 
    uint256 liquidityWeight
) public view returns (address, uint256) {
    require(priceWeight + feeWeight + liquidityWeight == 100, "Weights must sum up to 100");

    uint256 bestScore = 0;
    address bestDex = address(0);

    for (uint256 i = 0; i < dexes.length; i++) {
        IExchange dex = IExchange(dexes[i]);

        uint256 amountOut = dex.getAmountOut(amountIn, tokenIn, tokenOut);
        uint256 fee = dex.getFee(amountIn, tokenIn, tokenOut);
        uint256 liquidity = dex.getLiquidity(tokenIn, tokenOut);

        if (liquidity < amountIn) continue;

        uint256 score = (amountOut * priceWeight / 100) - (fee * feeWeight / 100) + (liquidity * liquidityWeight / 100);
        if (score > bestScore) {
            bestScore = score;
            bestDex = dexes[i];
        }
    }

    require(bestDex != address(0), "No suitable DEX found");

    // Remove the emit statement, making the function a true 'view' function
    // emit BestDexSelected(bestDex, bestScore);

    return (bestDex, bestScore);
}

    function swapOnBestDex(
        address bestDex,
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) external returns (uint256 amountOut) {
        require(bestDex != address(0), "Invalid DEX address");

        // Transfer the input tokens from the caller to this contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        // Approve the DEX to spend tokens on behalf of this contract
        IERC20(tokenIn).approve(bestDex, amountIn);

        // Execute the swap on the DEX
        uint256 amountOutReceived = IExchange(bestDex).getAmountOut(amountIn, tokenIn, tokenOut);

        // Transfer the output tokens from this contract to the caller
        IERC20(tokenOut).transfer(msg.sender, amountOutReceived);

        // Log the swap event
        emit SwapExecuted(bestDex, amountIn, tokenIn, tokenOut, amountOutReceived);

        return amountOutReceived;
    }

}
