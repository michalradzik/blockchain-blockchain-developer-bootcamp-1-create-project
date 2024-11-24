// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Token.sol";

contract AMM {
    Token public token1;
    Token public token2;

    uint256 public token1Balance;
    uint256 public token2Balance;
    uint256 public K;

    uint256 public totalShares;
    mapping(address => uint256) public shares;
    uint256 constant PRECISION = 10**18;

    mapping(bytes32 => SwapDetails) public swaps; // Mapping do przechowywania szczegółów swapów

    struct SwapDetails {
        address user;
        address tokenGive;
        uint256 tokenGiveAmount;
        address tokenGet;
        uint256 tokenGetAmount;
        uint256 timestamp;
    }

    event Swap(
        bytes32 indexed swapHash,
        address user,
        address tokenGive,
        uint256 tokenGiveAmount,
        address tokenGet,
        uint256 tokenGetAmount,
        uint256 token1Balance,
        uint256 token2Balance,
        uint256 timestamp
    );

    constructor(Token _token1, Token _token2) {
        token1 = _token1;
        token2 = _token2;
    }

    function addLiquidity(uint256 _token1Amount, uint256 _token2Amount) external {
        // Deposit Tokens
        require(
            token1.transferFrom(msg.sender, address(this), _token1Amount),
            "failed to transfer token 1"
        );
        require(
            token2.transferFrom(msg.sender, address(this), _token2Amount),
            "failed to transfer token 2"
        );

        // Issue Shares
        uint256 share;

        // If first time adding liquidity, make share 100
        if (totalShares == 0) {
            share = 100 * PRECISION;
        } else {
            uint256 share1 = (totalShares * _token1Amount) / token1Balance;
            uint256 share2 = (totalShares * _token2Amount) / token2Balance;
            require(
                (share1 / 10**3) == (share2 / 10**3),
                "must provide equal token amounts"
            );
            share = share1;
        }

        // Manage Pool
        token1Balance += _token1Amount;
        token2Balance += _token2Amount;
        K = token1Balance * token2Balance;

        // Updates shares
        totalShares += share;
        shares[msg.sender] += share;
    }

    function calculateToken2Deposit(uint256 _token1Amount)
        public
        view
        returns (uint256 token2Amount)
    {
        token2Amount = (token2Balance * _token1Amount) / token1Balance;
    }

    function calculateToken1Deposit(uint256 _token2Amount)
        public
        view
        returns (uint256 token1Amount)
    {
        token1Amount = (token1Balance * _token2Amount) / token2Balance;
    }

    function calculateToken1Swap(uint256 _token1Amount)
        public
        view
        returns (uint256 token2Amount)
    {
        uint256 token1After = token1Balance + _token1Amount;
        uint256 token2After = K / token1After;
        token2Amount = token2Balance - token2After;

        if (token2Amount == token2Balance) {
            token2Amount--;
        }

        require(token2Amount < token2Balance, "swap amount to large");
    }

    function swapToken1(uint256 _token1Amount)
        external
        returns (uint256 token2Amount)
    {
        token2Amount = calculateToken1Swap(_token1Amount);

        token1.transferFrom(msg.sender, address(this), _token1Amount);
        token1Balance += _token1Amount;
        token2Balance -= token2Amount;
        token2.transfer(msg.sender, token2Amount);

        bytes32 swapHash = keccak256(
            abi.encodePacked(msg.sender, _token1Amount, token2Amount, block.timestamp)
        );

        swaps[swapHash] = SwapDetails({
            user: msg.sender,
            tokenGive: address(token1),
            tokenGiveAmount: _token1Amount,
            tokenGet: address(token2),
            tokenGetAmount: token2Amount,
            timestamp: block.timestamp
        });

        emit Swap(
            swapHash,
            msg.sender,
            address(token1),
            _token1Amount,
            address(token2),
            token2Amount,
            token1Balance,
            token2Balance,
            block.timestamp
        );
    }

    function calculateToken2Swap(uint256 _token2Amount)
        public
        view
        returns (uint256 token1Amount)
    {
        uint256 token2After = token2Balance + _token2Amount;
        uint256 token1After = K / token2After;
        token1Amount = token1Balance - token1After;

        if (token1Amount == token1Balance) {
            token1Amount--;
        }

        require(token1Amount < token1Balance, "swap amount to large");
    }

    function swapToken2(uint256 _token2Amount)
        external
        returns (uint256 token1Amount)
    {
        token1Amount = calculateToken2Swap(_token2Amount);

        token2.transferFrom(msg.sender, address(this), _token2Amount);
        token2Balance += _token2Amount;
        token1Balance -= token1Amount;
        token1.transfer(msg.sender, token1Amount);

        bytes32 swapHash = keccak256(
            abi.encodePacked(msg.sender, _token2Amount, token1Amount, block.timestamp)
        );

        swaps[swapHash] = SwapDetails({
            user: msg.sender,
            tokenGive: address(token2),
            tokenGiveAmount: _token2Amount,
            tokenGet: address(token1),
            tokenGetAmount: token1Amount,
            timestamp: block.timestamp
        });

        emit Swap(
            swapHash,
            msg.sender,
            address(token2),
            _token2Amount,
            address(token1),
            token1Amount,
            token1Balance,
            token2Balance,
            block.timestamp
        );
    }

    function calculateWithdrawAmount(uint256 _share)
        public
        view
        returns (uint256 token1Amount, uint256 token2Amount)
    {
        require(_share <= totalShares, "must be less than total shares");
        token1Amount = (_share * token1Balance) / totalShares;
        token2Amount = (_share * token2Balance) / totalShares;
    }

    function removeLiquidity(uint256 _share)
        external
        returns (uint256 token1Amount, uint256 token2Amount)
    {
        require(
            _share <= shares[msg.sender],
            "cannot withdraw more shares than you have"
        );

        (token1Amount, token2Amount) = calculateWithdrawAmount(_share);

        shares[msg.sender] -= _share;
        totalShares -= _share;

        token1Balance -= token1Amount;
        token2Balance -= token2Amount;
        K = token1Balance * token2Balance;

        token1.transfer(msg.sender, token1Amount);
        token2.transfer(msg.sender, token2Amount);
    }

    function getSwapDetails(bytes32 swapHash)
        external
        view
        returns (SwapDetails memory)
    {
        require(swaps[swapHash].timestamp != 0, "Swap not found");
        return swaps[swapHash];
    }
}
