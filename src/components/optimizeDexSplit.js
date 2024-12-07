export const optimizeDexSplit = async ({
    glpkInstance,
    dexesData,
    priceWeight,
    feeWeight,
    liquidityWeight,
    setBestDex,
    setHighlightedDex,
    setAlertMessage,
    setShowAlert
}) => {
    console.log("Starting optimization... glpkInstance =", glpkInstance);

    if (!glpkInstance) {
        console.error("GLPK instance is not initialized.");
        setAlertMessage("Optimization failed: GLPK not initialized");
        setShowAlert(true);
        return;
    }

    try {
        console.log("Weights used in optimization:");
        console.log("  Price Weight:", priceWeight);
        console.log("  Fee Weight:", feeWeight);
        console.log("  Liquidity Weight:", liquidityWeight);

        console.log("Calculating optimization variables...");;
        // Calculate max and min values for normalization
        console.log("DEX Data:", dexesData);

        const maxPrice = Math.max(...dexesData.map(dex => parseFloat(dex.price || 0)));
        const minPrice = Math.min(...dexesData.map(dex => parseFloat(dex.price || 0)));
        
        const fees = dexesData.map(dex => parseFloat(dex.makerFee || 0) + parseFloat(dex.takerFee || 0));
        const minFee = Math.min(...fees);
        const maxFee = Math.max(...fees);
        
        const maxLiquidity = Math.max(...dexesData.map(dex => parseFloat(dex.liquidity?.token1 || 0)));
        
        console.log("Max Price:", maxPrice);
        console.log("Min Price:", minPrice);
        console.log("Min Fee:", minFee);
        console.log("Max Fee:", maxFee);
        console.log("Max Liquidity:", maxLiquidity);
        
        // Avoid division by zero
        const priceRange = maxPrice - minPrice || 1;
        const feeRange = maxFee - minFee || 1;
        
        const vars = dexesData.map((dex, index) => {
            const price = parseFloat(dex.price) || 0;
            const fee = parseFloat(dex.makerFee || 0) + parseFloat(dex.takerFee || 0);
            const liquidity = parseFloat(dex.liquidity?.token1) || 0;
        
            // Normalize values
            const normalizedPrice = (price - minPrice) / priceRange; // Lower price is better
            const normalizedFee = maxFee !== minFee ? (fee - minFee) / feeRange : 1; // Lower fee is better
            const normalizedLiquidity = liquidity / maxLiquidity; // Higher liquidity is better
        
            // Apply weights based on the primary priority
            let coef;
            if (priceWeight === Math.max(priceWeight, feeWeight, liquidityWeight)) {
                coef = normalizedPrice; // Focus on minimizing price
            } else if (liquidityWeight === Math.max(priceWeight, feeWeight, liquidityWeight)) {
                coef = normalizedLiquidity; // Focus on maximizing liquidity
            } else {
                coef = 
                    (normalizedPrice * priceWeight) / 100 + 
                    (normalizedFee * feeWeight) / 100 + 
                    (normalizedLiquidity * liquidityWeight) / 100;
            }
        
            console.log(
                `DEX ${dex.name} (Index ${index}) - Normalized Price: ${normalizedPrice.toFixed(4)}, Normalized Fee: ${normalizedFee.toFixed(4)}, Normalized Liquidity: ${normalizedLiquidity.toFixed(4)}, Coefficient: ${coef.toFixed(6)}`
            );
        
            return { name: `x${index}`, coef: coef };
        });

        console.log("Optimization variables:", vars);

        const maxPriority = Math.max(priceWeight, feeWeight, liquidityWeight);
        const objectiveDirection = 
            maxPriority === liquidityWeight ? glpkInstance.GLP_MAX : glpkInstance.GLP_MIN;

        console.log(
            "Optimization direction:",
            objectiveDirection === glpkInstance.GLP_MAX ? 'GLP_MAX' : 'GLP_MIN'
        );

        const lp = {
            name: 'dexOptimization',
            objective: { direction: objectiveDirection, vars },
            subjectTo: [
                {
                    name: 'selectionConstraint',
                    vars: vars.map((v) => ({ name: v.name, coef: 1 })),
                    bnds: { type: glpkInstance.GLP_FX, lb: 1, ub: 1 },
                },
            ],
        };

        console.log("Linear programming problem setup:", lp);

        const result = await glpkInstance.solve(lp);
        console.log("Full result from GLPK:", JSON.stringify(result, null, 2));

        if (!result || !result.result || !result.result.vars) {
            console.error("GLPK returned an invalid result structure:", result);
            setAlertMessage("Optimization failed: Invalid result from GLPK");
            setShowAlert(true);
            return;
        }

        const bestDexIndex = Object.entries(result.result.vars)
            .reduce(
                (best, [key, value]) => {
                    console.log(`Variable ${key} has value: ${value}`);
                    return value > best.value
                        ? { index: parseInt(key.replace('x', '')), value }
                        : best;
                },
                { index: -1, value: 0 }
            )
            .index;

        if (bestDexIndex >= 0) {
            setBestDex(dexesData[bestDexIndex]);
            setHighlightedDex(bestDexIndex);
            console.log("Optimization completed. Best DEX:", dexesData[bestDexIndex]);

            setTimeout(() => setHighlightedDex(null), 5000);
        } else {
            setBestDex(null);
            console.warn("No optimal DEX found");
            setAlertMessage("Optimization failed: No optimal DEX found");
            setShowAlert(true);
        }
    } catch (error) {
        console.error("Error during optimization:", error);
        setAlertMessage("Error during optimization: " + error.message);
        setShowAlert(true);
    }
};
