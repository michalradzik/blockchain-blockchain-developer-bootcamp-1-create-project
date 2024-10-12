// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IExchange {
    function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256);
    function getFee(uint256 amountIn, address tokenIn, address tokenOut) external view returns (uint256);
    function getLiquidity(address tokenIn, address tokenOut) external view returns (uint256);
    function swap(uint256 amountIn, address tokenIn, address tokenOut) external;
}
