import React, { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseUnits } from 'ethers';
import DexAggregator from './abis/DexAggregator.json';
import dexesData from './dexes.json';
import glpk from 'glpk.js'; // Import GLPK.js for optimization
import config from './config.json';

function App() {
    const [provider, setProvider] = useState(null);
    const [priceWeight, setPriceWeight] = useState(50); // Default value
    const [feeWeight, setFeeWeight] = useState(30); // Default value
    const [liquidityWeight, setLiquidityWeight] = useState(20); // Default value
    const [amountIn, setAmountIn] = useState("");
    const [tokenIn, setTokenIn] = useState("");
    const [tokenOut, setTokenOut] = useState("");
    const [dexes, setDexes] = useState([]);
    const [selectedPair, setSelectedPair] = useState(""); // Make sure this is updated correctly
    const [glpkInstance, setGlpkInstance] = useState(null); // Define glpkInstance in state
    const [bestDex, setBestDex] = useState(null); // Store the best DEX after optimization

    useEffect(() => {
        // Load DEXes from JSON file
        setDexes(dexesData);

        glpk().then(instance => {
            console.log("GLPK instance initialized:", instance); // Log the GLPK instance after initialization
            setGlpkInstance(instance); // Set GLPK instance after initialization
        }).catch(error => {
            console.error("Error initializing GLPK instance:", error); // Log any error during initialization
        });

        // Initialize default weights when the component mounts
        initializeDefaultWeights();
    }, []);

    // Function to initialize default weights
    const initializeDefaultWeights = () => {
        setPriceWeight(50);
        setFeeWeight(30);
        setLiquidityWeight(20);
    };

    // Function to handle weight changes
    const handleWeightChange = (name, value) => {
        let remaining;
        let totalRemainingWeight;

        if (name === "price") {
            remaining = 100 - value;
            totalRemainingWeight = feeWeight + liquidityWeight;
            setPriceWeight(value);
            setFeeWeight((feeWeight / totalRemainingWeight) * remaining);
            setLiquidityWeight((liquidityWeight / totalRemainingWeight) * remaining);
        } else if (name === "fee") {
            remaining = 100 - value;
            totalRemainingWeight = priceWeight + liquidityWeight;
            setFeeWeight(value);
            setPriceWeight((priceWeight / totalRemainingWeight) * remaining);
            setLiquidityWeight((liquidityWeight / totalRemainingWeight) * remaining);
        } else if (name === "liquidity") {
            remaining = 100 - value;
            totalRemainingWeight = priceWeight + feeWeight;
            setLiquidityWeight(value);
            setPriceWeight((priceWeight / totalRemainingWeight) * remaining);
            setFeeWeight((feeWeight / totalRemainingWeight) * remaining);
        }
    };

    // Function to handle token pair selection
    const handlePairSelect = (event) => {
        const pair = event.target.value;
        setSelectedPair(pair); // Set selected pair
        console.log("Selected Pair:", pair); // Log selected pair

        const [dexAddress, tokenInAddress, tokenOutAddress] = pair.split('/');

        // Find the matching pool in the dexes data and set tokenIn/tokenOut
        for (const dex of dexes) {
            if (dex.dexAddress === dexAddress) {
                const pool = dex.pools.find(p => p.pair === `${tokenInAddress}/${tokenOutAddress}` || p.pair === `${tokenOutAddress}/${tokenInAddress}`);
                if (pool) {
                    setTokenIn(pool.tokenIn.address);
                    setTokenOut(pool.tokenOut.address);
                    break;
                }
            }
        }
    };

    // Function to find the best DEX
    const handleFindBestDex = async () => {
        const provider = new BrowserProvider(window.ethereum);
        console.log('Provider:', provider);
        
        const signer = await provider.getSigner();
        console.log('Signer Address:', await signer.getAddress());
        
        const { chainId } = await provider.getNetwork();
        console.log('Network Chain ID:', chainId);
        
        const contractAddress = config[chainId]?.DexAggregator?.address;
        console.log('Contract Address:', contractAddress);
        
        
        if (!contractAddress) {
            console.error("DexAggregator contract address not found for this network.");
            return;
        }

        const dexAggregator = new Contract(contractAddress, DexAggregator, signer);

        if (priceWeight + feeWeight + liquidityWeight !== 100) {
            alert("Weights must sum up to 100%");
            return;
        }

        try {
            const amountInWei = parseUnits(amountIn, 'ether'); // Assuming ETH for simplicity

            if (!glpkInstance) {
                console.error("GLPK instance is not initialized.");
                return;
            }

            if (!dexes.length) {
                console.error("No DEX data available for optimization.");
                return;
            }

            // Get the best DEX and allocation from the optimization
            const { bestDex, bestAllocation } = await optimizeDexSplit(dexes, amountInWei, priceWeight, feeWeight, liquidityWeight, selectedPair);
            if (!bestDex || !bestDex.dexAddress) {
                console.error("Failed to get an optimal DEX or invalid dexAddress:", bestDex);
                return;
            }

            // Store the best DEX
            setBestDex(bestDex);

            // Now perform the swap on the best DEX
            console.log(`Swapping on the best DEX: ${bestDex.dexAddress} with allocation: ${bestAllocation}`);
            const gasLimit = 100000;
            const tx = await dexAggregator.swapOnBestDex(
                bestDex.dexAddress,
                amountInWei,
                tokenIn,
                tokenOut,
                {
                    value: amountInWei,
                    gasLimit: gasLimit
                }
            );

            await tx.wait();
            console.log("Swap completed successfully on the best DEX");

        } catch (error) {
            console.error("Error during DEX transaction:", error);
        }
    };

    const optimizeDexSplit = async (dexes, amountIn, priceWeight, feeWeight, liquidityWeight, selectedPair) => {
        if (!glpkInstance) {
            console.error("GLPK instance is not initialized.");
            return null;
        }
    
        try {
            const [dexAddress, tokenInAddress, tokenOutAddress] = selectedPair.split('/');
            console.log("Starting optimization with weights: Price:", priceWeight, "Fee:", feeWeight, "Liquidity:", liquidityWeight);
            console.log("Dexes:", dexes);
            console.log("Selected Pair:", selectedPair);
            console.log("Amount In:", amountIn.toString());
    
            // Ustal ilość wymiany jako współczynnik dla wszystkich DEX-ów
            const decisionVars = dexes.map((dex, index) => ({
                name: `x${index}`,
                coef: Number(amountIn.toString()) // Użyj ilości do wymiany jako współczynnika
            }));
    
            const vars = dexes.map((dex, index) => {
                if (dex.dexAddress !== dexAddress) return { name: `x${index}`, coef: 0 };
    
                const pool = dex.pools.find(p => 
                    (p.tokenIn.address === tokenInAddress && p.tokenOut.address === tokenOutAddress) || 
                    (p.tokenIn.address === tokenOutAddress && p.tokenOut.address === tokenInAddress)
                );
    
                if (!pool) {
                    console.warn(`No pool found for pair: ${tokenInAddress}/${tokenOutAddress} in dex: ${dex.name}`);
                    return { name: `x${index}`, coef: 0 };  // Skip if no pool matches
                }
    
                const rate = Number(pool.price);
                const fee = Number(dex.fee.taker);
                const liquidity = Number(pool.liquidity);
    
                if (isNaN(rate) || isNaN(fee) || isNaN(liquidity)) {
                    console.error(`Invalid values for dex: ${dex.name}`);
                    return { name: `x${index}`, coef: 0 };
                }
    
                const coef = (rate * priceWeight / 100) - (fee * feeWeight / 100) + (liquidity * liquidityWeight / 100);
                return { name: `x${index}`, coef };
            });
    
            console.log("Decision Variables (vars):", vars);
    
            const lp = {
                name: 'dexOptimization',
                objective: {
                    direction: glpkInstance.GLP_MAX,
                    vars,
                },
                subjectTo: [
                    {
                        name: 'allocationConstraint',
                        vars: decisionVars,
                        bnds: { type: glpkInstance.GLP_UP, ub: Number(amountIn.toString()) } // Ograniczenie do ilości wymiany
                    }
                ]
            };
    
            console.log("LP Structure:", JSON.stringify(lp, null, 2));
    
            const result = await glpkInstance.solve(lp);
            console.log("Optimization Result:", result);
    
            let bestDexIndex = -1;
            let bestAllocation = 0;
            for (const [key, value] of Object.entries(result.result.vars)) {
                if (value > bestAllocation) {
                    bestAllocation = value;
                    bestDexIndex = key.replace('x', '');  // Extract the index from 'x'
                }
            }
    
            if (bestDexIndex !== -1) {
                const bestDex = dexes[bestDexIndex];
                return { bestDex, bestAllocation };
            } else {
                console.error("No optimal DEX found");
                return null;
            }
    
        } catch (error) {
            console.error("Error during GLPK optimization:", error);
            return null;
        }
    };
    

    return (
        <div>
            <h1>DEX Aggregator - Choose Optimization Scenario</h1>

            <div>
                <button onClick={initializeDefaultWeights}>Reset to Balanced</button>
                <button onClick={() => handleWeightChange("price", 70)}>Price Priority</button>
                <button onClick={() => handleWeightChange("fee", 50)}>Fee Priority</button>
                <button onClick={() => handleWeightChange("liquidity", 50)}>Liquidity Priority</button>
            </div>

            <div>
                <label>Price: {priceWeight}%</label>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={priceWeight}
                    onChange={(e) => handleWeightChange("price", Number(e.target.value))}
                />
            </div>

            <div>
                <label>Fee: {feeWeight}%</label>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={feeWeight}
                    onChange={(e) => handleWeightChange("fee", Number(e.target.value))}
                />
            </div>

            <div>
                <label>Liquidity: {liquidityWeight}%</label>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={liquidityWeight}
                    onChange={(e) => handleWeightChange("liquidity", Number(e.target.value))}
                />
            </div>

            <div>
                <label>Select Token Pair: </label>
                <select value={selectedPair} onChange={handlePairSelect}>
                    <option value="">-- Select Token Pair --</option>
                    {dexes.map((dex, dexIndex) => (
                        dex.pools.map((pool, poolIndex) => (
                            <option 
                                key={`${dexIndex}-${poolIndex}`} 
                                value={`${dex.dexAddress}/${pool.tokenIn.address}/${pool.tokenOut.address}`}>
                                {`${dex.name}: ${pool.tokenIn.symbol} / ${pool.tokenOut.symbol} (${dex.dexAddress})`} 
                            </option>
                        ))
                    ))}
                </select>
            </div>

            <div>
                <label>Swap Amount (ETH): </label>
                <input
                    type="number"
                    value={amountIn}
                    onChange={(e) => setAmountIn(e.target.value)}
                    placeholder="Enter amount"
                />
            </div>

            <button onClick={handleFindBestDex}>Find Best DEX</button>
        </div>
    );
}

export default App;
