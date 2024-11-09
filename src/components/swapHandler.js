// swapHandler.js
import { loadProvider, loadNetwork, swap } from '../store/interactions';
import config from '../config.json';

export const handleSwap = async ({
    tokenIn, tokenOut, amountIn, bestDex, tokens, dispatch, setAlertMessage, setShowAlert, setIsSwapping
}) => {
    console.log("Initiating swap...");

    if (!tokenIn || !tokenOut || !amountIn) {
        console.warn("Swap aborted: missing tokens or amount.");
        setAlertMessage('Please select valid tokens and input amount');
        setShowAlert(true);
        return;
    }

    setIsSwapping(true);
    setShowAlert(false);

    try {
        if (!bestDex) {
            console.warn("Swap aborted: no optimal DEX selected.");
            setAlertMessage("Optimization required before swap");
            setIsSwapping(false);
            setShowAlert(true);
            return;
        }

        const provider = await loadProvider(dispatch);
        const chainId = await loadNetwork(provider, dispatch);
        const tokenAddresses = config[chainId];
        if (!tokenAddresses) {
            console.error(`No token configuration found for chainId ${chainId}`);
            return;
        }

        const dappTokenAddress = tokenAddresses.dapp.address;
        const tokenInAddress = tokenIn === "DAPP" ? dappTokenAddress : tokenAddresses.usd.address;
        console.log("Token in address:", tokenInAddress);
        console.log("Selected AMM contract address:", bestDex);

        if (tokenIn === "DAPP") {
            console.log("TokenIn is DAPP, proceeding with swap...");
            await swap(provider, bestDex, tokens[0], tokenIn, amountIn, dispatch);
        } else {
            console.log("TokenIn is not DAPP, proceeding with alternative swap...");
            await swap(provider, bestDex, tokens[1], tokenIn, amountIn, dispatch);
        }

        console.log("Transaction sent. Waiting for confirmation...");
        setAlertMessage('Swap completed successfully!');
    } catch (error) {
        console.error("Error during the swap:", error);
        setAlertMessage('Error during the swap: ' + error.message);
    } finally {
        setIsSwapping(false);
        setShowAlert(true);
    }
};
