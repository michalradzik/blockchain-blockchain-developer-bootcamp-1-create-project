// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IExchange.sol";
import "hardhat/console.sol";

contract MockDEX1 is IExchange {
    uint256 public slippageRate;    // Slippage rate (e.g., 95 for 95%)
    uint256 public fee;             // Customizable fee (e.g., 2 units)
    uint256 public liquidity;       // Customizable liquidity amount
    address public tokenIn;         // Address of the input token
    address public tokenOut;        // Address of the output token

    // Event to log swap execution
    event SwapExecuted(address indexed user, uint256 amountIn, uint256 amountOut, address tokenIn, address tokenOut);

    // Constructor to initialize the parameters dynamically
    constructor(
        uint256 _slippageRate,
        uint256 _fee,
        uint256 _liquidity,
        address _tokenIn,
        address _tokenOut
    ) {
        slippageRate = _slippageRate;
        fee = _fee;
        liquidity = _liquidity;
        tokenIn = _tokenIn;
        tokenOut = _tokenOut;
    }

    // Simulated token exchange using the slippage rate
    function getAmountOut(uint256 amountIn, address, address) public view override returns (uint256) {
        return (amountIn * slippageRate) / 100;
    }

    // Simulated fee (based on dynamic fee value)
    function getFee(uint256, address, address) external view override returns (uint256) {
        return fee;
    }

    // Simulated liquidity (based on dynamic liquidity value)
    function getLiquidity(address, address) external view override returns (uint256) {
        return liquidity;
    }

    // Swap function with dynamic tokens and parameters
    function swap(uint256 amountIn, address _tokenIn, address _tokenOut) external override {
        console.log("Swap initiated with amount:", amountIn);
        require(_tokenIn == tokenIn && _tokenOut == tokenOut, "Invalid token pair");

        // Check the allowance and balance before performing the swap
        uint256 allowance = IERC20(_tokenIn).allowance(msg.sender, address(this));
        uint256 balance = IERC20(_tokenIn).balanceOf(msg.sender);
        require(allowance >= amountIn, "Insufficient token allowance");
        require(balance >= amountIn, "Insufficient token balance");

        // Transfer tokens from the user to the contract
        IERC20(_tokenIn).transferFrom(msg.sender, address(this), amountIn);

        // Calculate the amount out and transfer it to the user
        uint256 amountOut = getAmountOut(amountIn, _tokenIn, _tokenOut);
        console.log("Swap successful, amountOut:", amountOut);
        IERC20(_tokenOut).transfer(msg.sender, amountOut);

        // Emit the SwapExecuted event
        emit SwapExecuted(msg.sender, amountIn, amountOut, _tokenIn, _tokenOut);
    }
}
