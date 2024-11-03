// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DexAggregator {
    struct Liquidity {
        uint256 token1;
        uint256 token2;
    }

    struct Fee {
        uint256 maker;
        uint256 taker;
    }

    struct Dex {
        string name;
        address ammAddress;
        uint256 price;
        Liquidity liquidity;
        Fee fee;
    }

    Dex[] public dexes;

    event BestDexSelected(
        string name,
        address ammAddress,
        uint256 price,
        uint256 liquidityToken1,
        uint256 liquidityToken2,
        uint256 feeMaker,
        uint256 feeTaker
    );

    // Dodawanie DEX-ów do kontraktu
    function addDex(
        string memory name,
        address ammAddress,
        uint256 price,
        uint256 liquidityToken1,
        uint256 liquidityToken2,
        uint256 feeMaker,
        uint256 feeTaker
    ) public {
        dexes.push(Dex({
            name: name,
            ammAddress: ammAddress,
            price: price,
            liquidity: Liquidity({token1: liquidityToken1, token2: liquidityToken2}),
            fee: Fee({maker: feeMaker, taker: feeTaker})
        }));
    }

   function findBestDex() public returns (string memory, address) {
    require(dexes.length > 0, "No DEX available");

    uint256 bestPrice = 0;
    uint256 bestIndex = 0;

    for (uint256 i = 0; i < dexes.length; i++) {
        if (dexes[i].price > bestPrice) {
            bestPrice = dexes[i].price;
            bestIndex = i;
        }
    }

    Dex memory bestDex = dexes[bestIndex];

    // Emitowanie zdarzenia z informacjami o najlepszym DEX-ie
    emit BestDexSelected(
        bestDex.name,
        bestDex.ammAddress,
        bestDex.price,
        bestDex.liquidity.token1,
        bestDex.liquidity.token2,
        bestDex.fee.maker,
        bestDex.fee.taker
    );

    return (bestDex.name, bestDex.ammAddress);
}

function getDexCount() public view returns (uint256) {
    return dexes.length;
}

}
