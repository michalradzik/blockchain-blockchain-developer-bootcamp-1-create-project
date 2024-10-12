// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AddressRegistry {
    mapping(string => address) public registry;

    // Set the address of a contract by name
    function setAddress(string memory _name, address _contractAddress) public {
        registry[_name] = _contractAddress;
    }

    // Get the address of a contract by name
    function getAddress(string memory _name) public view returns (address) {
        return registry[_name];
    }
}
