import React, { useState, useEffect } from 'react';
import { Alert} from 'react-bootstrap';
import PriorityButtons from './PriorityButtons';
import Navigation from './Navigation';
import glpk from 'glpk.js';
import './App.css';
import { ethers } from 'ethers';
import SwapForm from './SwapForm';
import DexTable from './DexTable';
import backgroundImage from '../background16.jpeg';
import DexAggregatorArtifact from '../abis/DexAggregator.json';
import Token from '../abis/Token.json';
import { useSelector, useDispatch } from 'react-redux';
import { optimizeDexSplit } from './optimizeDexSplit';
import { Routes, Route} from 'react-router-dom';
import AmmDetails from './AmmDetails';
import SwapHistory from './SwapHistory';
import {
  swap,
  loadProvider,
  loadNetwork,
  loadAccount,
  loadTokens,
  loadAMM,
  loadBalances
} from '../store/interactions';

function App() {

  
  const [dexAggregator, setDexAggregator] = useState(null);
  const [tokens, setTokens] = useState(null);
  const [activePriority, setActivePriority] = useState('');
  const [priceWeight, setPriceWeight] = useState(50);
  const [feeWeight, setFeeWeight] = useState(30);
  const [liquidityWeight, setLiquidityWeight] = useState(20);
  const [amountIn, setAmountIn] = useState('');
  const [tokenIn, setTokenIn] = useState(null);
  const [tokenOut, setTokenOut] = useState(null);
  const [outputAmount, setOutputAmount] = useState(0);
  const [glpkInstance, setGlpkInstance] = useState(null);
  const [bestDex, setBestDex] = useState(null);
  const [highlightedDex, setHighlightedDex] = useState(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [amms, setAmms] =  useState([]);
  const [networkName, setNetworkName] = useState('');
  const provider = useSelector((state) => loadProvider);
  const [swapHistory, setSwapHistory] = useState([]);
 
  if (!provider) {
    console.warn('Provider is not available. Ensure wallet is connected.');
  }
  
  const fetchSwapHistory = async () => {
    try {
      if (!dexAggregator) {
        console.warn('DexAggregator is not initialized.');
        return [];
      }
  
      const rawHistory = await dexAggregator.getSwapHistory();
      console.log('Raw swap history:', rawHistory);
  
      const formattedHistory = rawHistory.map((swap) => {
        // Znajdź nazwy tokenów na podstawie adresów
        const tokenInName = tokens?.find((t) => t.tokenAddress.toLowerCase() === swap.tokenIn.toLowerCase())?.name || 'Unknown';
        const tokenOutName = tokens?.find((t) => t.tokenAddress.toLowerCase() === swap.tokenOut.toLowerCase())?.name || 'Unknown';
  
        return {
          user: swap.user,
          ammName: swap.ammName || 'Unknown',
          tokenGive: tokenInName, // Użyj nazwy tokena zamiast adresu
          tokenGiveAmount: ethers.utils.formatUnits(swap.amountIn, 18),
          tokenGet: tokenOutName, // Użyj nazwy tokena zamiast adresu
          tokenGetAmount: ethers.utils.formatUnits(swap.amountOut, 18),
          timestamp: new Date(swap.timestamp.toNumber() * 1000).toLocaleString(),
          transactionHash: swap.txHash || 'Unknown',
        };
      });
  
      console.log('Formatted swap history:', formattedHistory);
      return formattedHistory;
    } catch (error) {
      console.error('Error fetching swap history:', error);
      return [];
    }
  };
  


  useEffect(() => {
    const loadSwapHistory = async () => {
      const history = await fetchSwapHistory();
      setSwapHistory(history);
    };
  
    loadSwapHistory();
  }, [dexAggregator]);
  
  
  const dispatch = useDispatch();
  useEffect(() => {
    console.log('DexAggregator state updated:', dexAggregator);
  }, [dexAggregator]);
  const user = loadAccount;
  useEffect(() => {
    glpk()
      .then((instance) => {
        setGlpkInstance(instance);
        console.log('GLPK instance initialized:', instance);
      })
      .catch((error) => console.error('Error initializing GLPK:', error));
  }, []);


  const initializeToken = (provider, tokenAddress) => {
    return new ethers.Contract(tokenAddress, Token, provider);
  };
  
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('chainChanged', async () => {
        const provider = await loadProvider(dispatch);
        const { chainId } = await loadNetwork(provider, dispatch);
        setNetworkName(networkName);
        console.log(`Network changed (Chain ID: ${chainId})`);
      });
    }
  }, []);
  


  const DEX_AGGREGATOR_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Twój adres kontraktu

  useEffect(() => {
    const loadBlockchainData = async () => {
      try {
        console.log("Initializing provider...");
        const provider = await loadProvider(dispatch);
        console.log("Provider initialized:", provider);
  
        const { chainId, networkName } = await loadNetwork(provider, dispatch);
        console.log(`Connected to network: ${networkName} (Chain ID: ${chainId})`);
        setNetworkName(networkName);
  
        if (!DEX_AGGREGATOR_ADDRESS || DEX_AGGREGATOR_ADDRESS === ethers.constants.AddressZero) {
          throw new Error("DexAggregator address is invalid.");
        }
  
        console.log("DexAggregator address:", DEX_AGGREGATOR_ADDRESS);
  
        const dexAggregatorContract = new ethers.Contract(
          DEX_AGGREGATOR_ADDRESS,
          DexAggregatorArtifact.abi,
          provider.getSigner()
        );
        console.log("DexAggregator contract loaded:", dexAggregatorContract);
        setDexAggregator(dexAggregatorContract);
  
        // Fetch tokens
        const fetchedTokens = await dexAggregatorContract.getTokens();
        const formattedTokens = fetchedTokens.map(([name, symbol, tokenAddress]) => ({
          name: name || "Unknown",
          symbol: symbol || "UNK",
          tokenAddress: tokenAddress || ethers.constants.AddressZero,
        }));
        setTokens(formattedTokens);
        console.log("Fetched tokens:", formattedTokens);
  
        const fetchedAmms = await dexAggregatorContract.getDexes();
        console.log("Fetched AMMs from getDexes:", fetchedAmms);
  
        const formattedAmms = fetchedAmms.map(
          ([ammAddress, makerFee, takerFee, liquidityToken1, liquidityToken2, name], index) => {
            const token1 = parseFloat(
              ethers.utils.formatUnits(liquidityToken1 || ethers.BigNumber.from(0), 18)
            );
            const token2 = parseFloat(
              ethers.utils.formatUnits(liquidityToken2 || ethers.BigNumber.from(0), 18)
            );
            const price = token1 > 0 ? token2 / token1 : 0;
  
            return {
              name: name || `AMM ${index + 1}`,
              ammAddress: ammAddress || "0x0",
              makerFee: parseFloat(
                ethers.utils.formatUnits(makerFee || ethers.BigNumber.from(0), 4)
              ),
              takerFee: parseFloat(
                ethers.utils.formatUnits(takerFee || ethers.BigNumber.from(0), 4)
              ),
              liquidity: {
                token1,
                token2,
              },
              tokenInSymbol: "N/A",
              tokenOutSymbol: "N/A",
              tokenIn: "N/A",
              tokenOut: "N/A",
              price,
            };
          }
        );
  
        setAmms(formattedAmms);
        console.log("Formatted AMMs:", formattedAmms);
  
        glpk()
          .then((instance) => console.log("GLPK instance initialized:", instance))
          .catch((error) => console.error("Error initializing GLPK:", error));
      } catch (error) {
        console.error("Error loading blockchain data:", error);
        setAlertMessage(error.message || "An error occurred while loading blockchain data.");
        setShowAlert(true);
      }
    };
  
    loadBlockchainData();
  }, []);
  
    
    const handleSwap = async () => {
      console.log('Initiating swap...');
      console.log('dexAggregator in handleSwap', dexAggregator);
      if (!tokenIn || !tokenOut || !amountIn) {
        console.warn('Swap aborted: missing tokens or amount.');
        setAlertMessage('Please select valid tokens and input amount');
        setShowAlert(true);
        return;
      }
    
      setIsSwapping(true);
      setShowAlert(false);
    
      try {
        if (!bestDex) {
          console.warn('Swap aborted: no optimal DEX selected.');
          setAlertMessage('Optimization required before swap');
          setIsSwapping(false);
          setShowAlert(true);
          return;
        }
    
        const provider = await loadProvider(dispatch);
        const user = await loadAccount(dispatch);
        const chainId = await loadNetwork(provider, dispatch);
    
        if (!tokens) {
          console.error('No token configuration found.');
          return;
        }
    
        // Map token names to their addresses
        const tokenInAddress = tokens.find((t) => t.symbol === tokenIn)?.tokenAddress;
        const tokenOutAddress = tokens.find((t) => t.symbol === tokenOut)?.tokenAddress;
    
        if (!tokenInAddress || !tokenOutAddress) {
          console.error('Invalid token addresses:', { tokenInAddress, tokenOutAddress });
          setAlertMessage('Invalid tokens selected.');
          setShowAlert(true);
          setIsSwapping(false);
          return;
        }
        let transaction;

         const tokenContract = initializeToken(provider, tokenInAddress);
         console.log("Tokens contract", tokenContract)
         transaction = await swap(provider, bestDex, tokenContract, tokenIn, amountIn, dispatch);
        
    if (!transaction) {
        console.warn('Swap aborted: transaction failed.');
        setAlertMessage('Swap failed.');
        setIsSwapping(false);
        setShowAlert(true);
        return;
    }

    // Oczekiwanie na potwierdzenie transakcji
    console.log('Waiting for transaction confirmation...');
    const receipt = await transaction.wait();

    if (receipt.status !== 1) {
        console.warn('Swap transaction failed on-chain.');
        setAlertMessage('Swap failed on-chain.');
        setIsSwapping(false);
        setShowAlert(true);
        return;
    }

    console.log('Swap transaction confirmed:', transaction.hash);
    console.log('Token in address:', tokenInAddress);
    console.log('Token out address:', tokenOutAddress);
    console.log('Selected AMM contract address:', bestDex.ammAddress);
    
    const parsedAmountIn = ethers.utils.parseUnits(amountIn.toString(), 18);
    const parsedOutputAmount = ethers.utils.parseUnits(outputAmount.toString(), 18);
    
    console.log('Parsed amountIn (in wei):', parsedAmountIn.toString());
    console.log('Parsed outputAmount (in wei):', parsedOutputAmount.toString());
    
    // Wywołanie funkcji executeSwap w kontrakcie po potwierdzeniu transakcji
    console.log('Executing swap on DexAggregator...');
    console.log('Executing bestDex.ammAddress', bestDex.ammAddress);
    const transactionSwapHistory = await dexAggregator.executeSwap(
        bestDex.ammAddress,
        tokenInAddress,
        tokenOutAddress,
        parsedAmountIn,
        parsedOutputAmount,
        transaction.hash,
        bestDex.name

    );
    const updatedHistory = await fetchSwapHistory();
    setSwapHistory(updatedHistory);
    console.log('Swap history transaction confirmed:', transactionSwapHistory.hash);
    setAlertMessage('Swap executed successfully!');
} catch (error) {
    console.error('Error during the swap process:', error);
    setAlertMessage('Swap failed: ' + error.message);
} finally {
    setIsSwapping(false);
    setShowAlert(true);
}
    };
    
    const handleOptimize = async () => {
      if (glpkInstance) {
        await optimizeDexSplit({
          glpkInstance,
          dexesData: amms,
          priceWeight,
          feeWeight,
          liquidityWeight,
          setBestDex,
          setHighlightedDex,
          setAlertMessage,
          setShowAlert,
        });
      } else {
        console.error('GLPK instance is not ready.');
      }
    };
    console.log('AMMs state before rendering:', amms);
    const handlePricePriority = () => {
      setPriceWeight(50);
      setFeeWeight(30);
      setLiquidityWeight(20);
      setActivePriority('Price');
    };
    
    const handleFeePriority = () => {
      setPriceWeight(10);
      setFeeWeight(80);
      setLiquidityWeight(10);
      setActivePriority('Fee');
    };
    
    const handleLiquidityPriority = () => {
      setPriceWeight(30);
      setFeeWeight(20);
      setLiquidityWeight(50);
      setActivePriority('Liquidity');
    };
    
    return (
      <div
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '100vh',
        padding: '20px',
      }}
      >
        {/* Dodanie komponentu Navigation */}
        <Navigation />
    
        <Routes>
  <Route
    path="/"
    element={
      <>
        <div className="my-3 text-center">
          

          <PriorityButtons 
  activePriority={activePriority}
  handlePricePriority={handlePricePriority}
  handleFeePriority={handleFeePriority}
  handleLiquidityPriority={handleLiquidityPriority}
/>
        </div>

        {showAlert && <Alert variant="danger">{alertMessage}</Alert>}

        <SwapForm
          amountIn={amountIn}
          setAmountIn={setAmountIn}
          tokenIn={tokenIn}
          setTokenIn={setTokenIn}
          tokenOut={tokenOut}
          setTokenOut={setTokenOut}
          outputAmount={outputAmount}
          setOutputAmount={setOutputAmount}
          isSwapping={isSwapping}
          handleSwap={handleSwap}
          handleOptimize={handleOptimize}
          provider={provider}
          dexesData={amms}
          dexAggregator={dexAggregator}
        />

        {showAlert && (
          <div className="relative w-full h-full">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <Alert
                variant="info"
                className="text-center"
                onClose={() => setShowAlert(false)}
                dismissible
              >
                {alertMessage}
              </Alert>
            </div>
          </div>
        )}

        <h3>AMMs</h3>
        <DexTable amms={amms} highlightedDex={highlightedDex} />

        <SwapHistory swapHistory={swapHistory} /> {/* Użycie nowego komponentu */}
      </>
    }
  />
  <Route path="/amm/:ammId" element={<AmmDetails amms={amms} />} />
</Routes>
      </div>
    );
  }    

export default App;
