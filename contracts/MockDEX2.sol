// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import interfejsu ERC20, aby móc pracować z tokenami zgodnymi z ERC-20
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// Importuje nasz własny kontrakt Token.sol, który zarządza tokenami
import "./Token.sol";

contract MockDEX2 {
    // Deklaracja zmiennych stanu dla dwóch tokenów, którymi będziemy handlować
    Token public token1;
    Token public token2;

    // Zmienna przechowująca balans dla każdego z tokenów w puli płynności
    uint256 public token1Balance;
    uint256 public token2Balance;
    
    // Stała produktu (x * y = K), gdzie x to balans token1, a y to balans token2
    uint256 public K;

    // Stała precyzji do obliczeń matematycznych
    uint256 constant PRECISION = 10**18;

    // Zdarzenie (event) emitowane podczas wymiany tokenów, rejestrujące szczegóły transakcji
    event Swap(
        address user,              // Adres użytkownika wykonującego wymianę
        address tokenGive,         // Adres tokena przekazywanego
        uint256 tokenGiveAmount,   // Ilość tokenów przekazywanych
        address tokenGet,          // Adres tokena otrzymywanego
        uint256 tokenGetAmount,    // Ilość tokenów otrzymywanych
        uint256 token1Balance,     // Zaktualizowany balans token1 w puli
        uint256 token2Balance,     // Zaktualizowany balans token2 w puli
        uint256 timestamp          // Czas wykonania transakcji
    );

    // Konstruktor ustawiający początkowe wartości dla tokenów w DEX
    constructor(Token _token1, Token _token2) {
        token1 = _token1;  // Przypisanie adresu token1
        token2 = _token2;  // Przypisanie adresu token2
    }

    // Funkcja dodająca płynność do puli DEX (tokeny muszą być przesłane przez użytkownika)
    function addLiquidity(uint256 _token1Amount, uint256 _token2Amount) external {
        // Przenosi token1 od użytkownika do kontraktu
        require(token1.transferFrom(msg.sender, address(this), _token1Amount), "Token1 transfer failed");
        // Przenosi token2 od użytkownika do kontraktu
        require(token2.transferFrom(msg.sender, address(this), _token2Amount), "Token2 transfer failed");

        // Jeżeli to pierwszy raz dodawana jest płynność, ustaw stałą produktu K
        if (token1Balance == 0 && token2Balance == 0) {
            K = _token1Amount * _token2Amount;
        } else {
            // Jeśli płynność już istnieje, utrzymaj stałą produktu
            K = token1Balance * token2Balance;
        }

        // Aktualizuje stan puli płynności dla obu tokenów
        token1Balance += _token1Amount;
        token2Balance += _token2Amount;
    }

    // Funkcja obliczająca ilość tokenów token2, które otrzyma użytkownik po wymianie token1
    function calculateSwapToken1(uint256 _token1Amount) public view returns (uint256 token2Amount) {
        // Oblicz nowy balans token1 po dodaniu wartości _token1Amount
        uint256 token1After = token1Balance + _token1Amount;
        // Oblicz nowy balans token2, aby utrzymać stałą produktu (K)
        uint256 token2After = K / token1After;
        // Oblicz ilość tokenów token2 do przekazania użytkownikowi
        token2Amount = token2Balance - token2After;
        
        // Upewnij się, że ilość tokenów token2 po wymianie jest mniejsza niż dostępna płynność
        require(token2Amount < token2Balance, "Swap exceeds liquidity");
    }

    // Funkcja wykonująca wymianę token1 na token2
    function swapToken1(uint256 _token1Amount) external returns (uint256 token2Amount) {
        // Oblicz ilość tokenów token2, które użytkownik otrzyma
        token2Amount = calculateSwapToken1(_token1Amount);
        
        // Przenosi tokeny token1 od użytkownika do kontraktu
        require(token1.transferFrom(msg.sender, address(this), _token1Amount), "Token1 transfer failed");

        // Aktualizuje stany puli płynności dla obu tokenów
        token1Balance += _token1Amount;
        token2Balance -= token2Amount;

        // Przekazuje tokeny token2 do użytkownika
        require(token2.transfer(msg.sender, token2Amount), "Token2 transfer failed");

        // Emituje zdarzenie, które zapisuje szczegóły transakcji
        emit Swap(msg.sender, address(token1), _token1Amount, address(token2), token2Amount, token1Balance, token2Balance, block.timestamp);
    }

    // Funkcja obliczająca ilość tokenów token1, które otrzyma użytkownik po wymianie token2
    function calculateSwapToken2(uint256 _token2Amount) public view returns (uint256 token1Amount) {
        // Oblicz nowy balans token2 po dodaniu wartości _token2Amount
        uint256 token2After = token2Balance + _token2Amount;
        // Oblicz nowy balans token1, aby utrzymać stałą produktu (K)
        uint256 token1After = K / token2After;
        // Oblicz ilość tokenów token1 do przekazania użytkownikowi
        token1Amount = token1Balance - token1After;

        // Upewnij się, że ilość tokenów token1 po wymianie jest mniejsza niż dostępna płynność
        require(token1Amount < token1Balance, "Swap exceeds liquidity");
    }

    // Funkcja wykonująca wymianę token2 na token1
    function swapToken2(uint256 _token2Amount) external returns (uint256 token1Amount) {
        // Oblicz ilość tokenów token1, które użytkownik otrzyma
        token1Amount = calculateSwapToken2(_token2Amount);
        
        // Przenosi tokeny token2 od użytkownika do kontraktu
        require(token2.transferFrom(msg.sender, address(this), _token2Amount), "Token2 transfer failed");

        // Aktualizuje stany puli płynności dla obu tokenów
        token2Balance += _token2Amount;
        token1Balance -= token1Amount;

        // Przekazuje tokeny token1 do użytkownika
        require(token1.transfer(msg.sender, token1Amount), "Token1 transfer failed");

        // Emituje zdarzenie, które zapisuje szczegóły transakcji
        emit Swap(msg.sender, address(token2), _token2Amount, address(token1), token1Amount, token1Balance, token2Balance, block.timestamp);
    }
}
