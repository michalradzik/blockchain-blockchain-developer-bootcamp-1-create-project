// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import interfejsu ERC20, aby można było pracować z tokenami
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// Import kontraktu Token, który zarządza tokenami
import "./Token.sol";

contract MockDEX1 {
    // Zmienne stanu dla tokenów, które będą handlowane
    Token public token1;
    Token public token2;

    // Zmienne przechowujące aktualne balanse tokenów w puli płynności
    uint256 public token1Balance;
    uint256 public token2Balance;

    // Stała produktu, x * y = K, gdzie x to balans token1, a y to balans token2
    uint256 public K;

    // Stała precyzji dla obliczeń matematycznych
    uint256 constant PRECISION = 10**18;

    // Zdarzenie, które będzie emitowane podczas wymiany tokenów, rejestrujące szczegóły transakcji
    event Swap(
        address user,              // Adres użytkownika wykonującego wymianę
        address tokenGive,         // Adres tokena, który użytkownik przekazuje
        uint256 tokenGiveAmount,   // Ilość tokenów przekazywanych
        address tokenGet,          // Adres tokena, który użytkownik otrzymuje
        uint256 tokenGetAmount,    // Ilość tokenów otrzymywanych
        uint256 token1Balance,     // Aktualny balans token1 po wymianie
        uint256 token2Balance,     // Aktualny balans token2 po wymianie
        uint256 timestamp          // Czas wykonania transakcji
    );

    // Konstruktor przypisujący tokeny dla DEX
    constructor(Token _token1, Token _token2) {
        token1 = _token1;  // Przypisanie adresu token1
        token2 = _token2;  // Przypisanie adresu token2
    }

    // Funkcja pozwalająca dodać płynność do puli DEX
    function addLiquidity(uint256 _token1Amount, uint256 _token2Amount) external {
        // Transfer tokenów od użytkownika do DEX
        require(token1.transferFrom(msg.sender, address(this), _token1Amount), "Token1 transfer failed");
        require(token2.transferFrom(msg.sender, address(this), _token2Amount), "Token2 transfer failed");

        // Jeśli to pierwsza wpłata płynności, ustaw stałą produktu K
        if (token1Balance == 0 && token2Balance == 0) {
            K = _token1Amount * _token2Amount;
        } else {
            // Jeśli płynność już istnieje, utrzymaj stałą produktu
            K = token1Balance * token2Balance;
        }

        // Aktualizacja bilansu płynności dla tokenów
        token1Balance += _token1Amount;
        token2Balance += _token2Amount;
    }

    // Funkcja obliczająca, ile tokenów token2 użytkownik otrzyma za wymianę token1
    function calculateSwapToken1(uint256 _token1Amount) public view returns (uint256 token2Amount) {
        // Oblicz nowy balans token1 po dodaniu _token1Amount
        uint256 token1After = token1Balance + _token1Amount;
        // Oblicz nowy balans token2, aby utrzymać stałą K
        uint256 token2After = K / token1After;
        // Ilość tokenów token2 do przekazania użytkownikowi
        token2Amount = token2Balance - token2After;
        
        // Upewnij się, że ilość tokenów token2 po wymianie jest mniejsza niż dostępna płynność
        require(token2Amount < token2Balance, "Swap exceeds liquidity");
    }

    // Funkcja wykonująca wymianę tokenów token1 na token2
    function swapToken1(uint256 _token1Amount) external returns (uint256 token2Amount) {
        // Oblicz ilość tokenów token2 do otrzymania
        token2Amount = calculateSwapToken1(_token1Amount);
        // Transfer token1 od użytkownika do kontraktu
        require(token1.transferFrom(msg.sender, address(this), _token1Amount), "Token1 transfer failed");

        // Aktualizacja balansu tokenów w puli płynności
        token1Balance += _token1Amount;
        token2Balance -= token2Amount;

        // Transfer tokenów token2 do użytkownika
        require(token2.transfer(msg.sender, token2Amount), "Token2 transfer failed");

        // Emituj zdarzenie rejestrujące szczegóły wymiany
        emit Swap(msg.sender, address(token1), _token1Amount, address(token2), token2Amount, token1Balance, token2Balance, block.timestamp);
    }

    // Funkcja obliczająca, ile tokenów token1 użytkownik otrzyma za wymianę token2
    function calculateSwapToken2(uint256 _token2Amount) public view returns (uint256 token1Amount) {
        // Oblicz nowy balans token2 po dodaniu _token2Amount
        uint256 token2After = token2Balance + _token2Amount;
        // Oblicz nowy balans token1, aby utrzymać stałą K
        uint256 token1After = K / token2After;
        // Ilość tokenów token1 do przekazania użytkownikowi
        token1Amount = token1Balance - token1After;

        // Upewnij się, że ilość tokenów token1 po wymianie jest mniejsza niż dostępna płynność
        require(token1Amount < token1Balance, "Swap exceeds liquidity");
    }

    // Funkcja wykonująca wymianę tokenów token2 na token1
    function swapToken2(uint256 _token2Amount) external returns (uint256 token1Amount) {
        // Oblicz ilość tokenów token1 do otrzymania
        token1Amount = calculateSwapToken2(_token2Amount);
        // Transfer tokenów token2 od użytkownika do kontraktu
        require(token2.transferFrom(msg.sender, address(this), _token2Amount), "Token2 transfer failed");

        // Aktualizacja balansu tokenów w puli płynności
        token2Balance += _token2Amount;
        token1Balance -= token1Amount;

        // Transfer tokenów token1 do użytkownika
        require(token1.transfer(msg.sender, token1Amount), "Token1 transfer failed");

        // Emituj zdarzenie rejestrujące szczegóły wymiany
        emit Swap(msg.sender, address(token2), _token2Amount, address(token1), token1Amount, token1Balance, token2Balance, block.timestamp);
    }
}
