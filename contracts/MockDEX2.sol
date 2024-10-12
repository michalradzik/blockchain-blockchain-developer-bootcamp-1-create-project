// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import interfejsu ERC20 z OpenZeppelin
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IExchange.sol";

contract MockDEX2 is IExchange {
    // Symulacja wymiany tokenów (zwraca 90% kwoty wejściowej)
    function getAmountOut(uint256 amountIn, address, address) public pure override returns (uint256) {  // Zmieniono na 'public'
        return (amountIn * 90) / 100; // Zwraca 90% kwoty wejściowej
    }

    // Symulacja opłaty (stała opłata 1 jednostka)
    function getFee(uint256, address, address) external pure override returns (uint256) {
        return 1; // Zwraca stałą opłatę 1 jednostkę
    }

    // Symulacja płynności (stała płynność 20000 jednostek)
    function getLiquidity(address, address) external pure override returns (uint256) {
        return 20000; // Zwraca stałą płynność 20000 jednostek
    }

    // Implementacja funkcji swap, opcjonalnie można dodać obsługę tokenów ERC20
    function swap(uint256 amountIn, address tokenIn, address tokenOut) external override {
        // Aby obsługiwać tokeny ERC20, musisz zaimportować IERC20 z OpenZeppelin i używać metod transfer
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn); // Pobieranie tokenów od użytkownika
        uint256 amountOut = getAmountOut(amountIn, tokenIn, tokenOut); // Wywołanie funkcji 'getAmountOut'
        IERC20(tokenOut).transfer(msg.sender, amountOut); // Wysyłanie tokenów wyjściowych do użytkownika
    }
}
