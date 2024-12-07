// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract Registry {
    // Rejestry dla różnych typów kontraktów
    mapping(string => address) private registry;
    mapping(string => address[]) private ammRegistry; // Rejestr dla AMM
    mapping(string => address[]) private tokenRegistry; // Rejestr dla tokenów

    // Zdarzenia
    event Registered(string indexed name, address indexed contractAddress);
    event AMMRegistered(string indexed category, address indexed ammAddress);
    event TokenRegistered(string indexed category, address indexed tokenAddress);

    // Rejestracja dowolnego kontraktu
    function register(string calldata name, address contractAddress) external {
        require(registry[name] == address(0), "Name already registered");
        registry[name] = contractAddress;
        emit Registered(name, contractAddress);
    }

    // Pobierz adres dowolnego kontraktu po nazwie
    function getAddress(string calldata name) external view returns (address) {
        return registry[name];
    }

    // Rejestracja AMM w danej kategorii
    function registerAMM(string calldata category, address ammAddress) external {
        ammRegistry[category].push(ammAddress);
        emit AMMRegistered(category, ammAddress);
    }

    // Pobierz wszystkie AMM z danej kategorii
    function getAMMs(string calldata category) external view returns (address[] memory) {
        return ammRegistry[category];
    }

    // Rejestracja tokena w danej kategorii
    function registerToken(string calldata category, address tokenAddress) external {
        tokenRegistry[category].push(tokenAddress);
        emit TokenRegistered(category, tokenAddress);
    }

    // Pobierz wszystkie tokeny z danej kategorii
    function getTokens(string calldata category) external view returns (address[] memory) {
        return tokenRegistry[category];
    }
}
