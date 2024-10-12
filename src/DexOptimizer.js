const lpsolve = require('lpsolve');

class DexOptimizer {
    constructor(price1, fee1, liquidity1, price2, fee2, liquidity2, weightSumConstraint = 100, maxFee = 5, minLiquidity = 5000) {
        this.dex1 = { price: price1, fee: fee1, liquidity: liquidity1 };
        this.dex2 = { price: price2, fee: fee2, liquidity: liquidity2 };
        this.weightSumConstraint = weightSumConstraint;
        this.maxFee = maxFee;
        this.minLiquidity = minLiquidity;
    }

    _setupModel(price, fee, liquidity) {
        const lp = new lpsolve.LinearProgram();
        
        // Dodanie zmiennych: priceWeight, feeWeight, liquidityWeight
        lp.addColumn('priceWeight', [0.7 * price, -1, 0]);
        lp.addColumn('feeWeight', [-0.2 * fee, 0, -1]);
        lp.addColumn('liquidityWeight', [0.1 * liquidity, 0, 1]);

        // Dynamiczne ograniczenia
        lp.addConstraint([1, 1, 1], 'EQ', this.weightSumConstraint);  // Suma wag
        lp.addConstraint([0, 1, 0], 'LE', this.maxFee);               // Opłaty muszą być ≤ maxFee
        lp.addConstraint([0, 0, 1], 'GE', this.minLiquidity);         // Płynność musi być ≥ minLiquidity

        // Ustawienie funkcji celu
        lp.setObjective([0.7 * price, -0.2 * fee, 0.1 * liquidity], 'max');
        
        return lp;
    }

    _optimizeDex(dex) {
        const lp = this._setupModel(dex.price, dex.fee, dex.liquidity);
        lp.solve();
        const [priceWeight, feeWeight, liquidityWeight] = lp.getSolution();
        return {
            priceWeight: priceWeight,
            feeWeight: feeWeight,
            liquidityWeight: liquidityWeight,
            score: lp.getObjectiveValue()  // Ocena optymalizacji dla porównania
        };
    }

    findBestDex() {
        // Optymalizacja dla DEX1
        const dex1Result = this._optimizeDex(this.dex1);
        console.log(`DEX 1 - Weights:`, dex1Result);

        // Optymalizacja dla DEX2
        const dex2Result = this._optimizeDex(this.dex2);
        console.log(`DEX 2 - Weights:`, dex2Result);

        // Porównanie wyników
        if (dex1Result.score > dex2Result.score) {
            return { bestDex: 'DEX 1', weights: dex1Result };
        } else {
            return { bestDex: 'DEX 2', weights: dex2Result };
        }
    }
}

// Przykład użycia
const optimizer = new DexOptimizer(
    10, 2, 7000,  // Parametry dla DEX 1
    12, 1, 6500,  // Parametry dla DEX 2
    100, 5, 5000  // Ograniczenia dla wag, maksymalnej opłaty i minimalnej płynności
);

const bestDex = optimizer.findBestDex();
console.log(`Best DEX is: ${bestDex.bestDex}`);
console.log(`Optimal Weights for ${bestDex.bestDex}:`, bestDex.weights);

