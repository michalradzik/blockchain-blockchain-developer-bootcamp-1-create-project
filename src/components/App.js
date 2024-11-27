// App.js
import React, { useState, useEffect } from 'react';
import config from '../config.json';
import dexesData from '../dexes.json';
import Navigation from './Navigation';
import glpk from 'glpk.js';
import './App.css';
import AMM_ABI from '../abis/AMM.json';
import { useSelector, useDispatch } from 'react-redux';
import { BrowserProvider, Contract} from 'ethers';
import Withdraw from './Withdraw';
import Deposit from './Deposit';
import { Routes, Route, Link } from 'react-router-dom';
import AmmDetails from './AmmDetails';
import { optimizeDexSplit } from './optimizeDexSplit';
import ReactDOM from 'react-dom/client';
import SwapForm from './SwapForm';
import DexTable from './DexTable';
import backgroundImage from '../background16.jpeg';
import logo from '../logo.png';
import { ethers } from 'ethers';

import {
  swap,
  loadProvider,
  loadNetwork,
  loadAccount,
  loadTokens,
  loadAMM,
  loadBalances
} from '../store/interactions';
import {
  Button,
  DropdownButton,
  Dropdown,
  Form,
  InputGroup,
  Spinner,
  Card,
  Row,
  Col,
  Alert,
  Table,
} from 'react-bootstrap';

function App() {
  const [activePriority, setActivePriority] = useState(''); // Stan dla aktywnego priorytetu
  const [priceWeight, setPriceWeight] = useState(50);
  const [feeWeight, setFeeWeight] = useState(30);
  const [liquidityWeight, setLiquidityWeight] = useState(20);
  const [amountIn, setAmountIn] = useState('');
  const [tokenIn, setTokenIn] = useState(null);
  const [tokenOut, setTokenOut] = useState(null);
  const [outputAmount, setOutputAmount] = useState(0);
  const [dexes, setDexes] = useState([]);
  const [glpkInstance, setGlpkInstance] = useState(null);
  const [bestDex, setBestDex] = useState(null);
  const [highlightedDex, setHighlightedDex] = useState(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [availableLiquidity, setAvailableLiquidity] = useState(null);
  const [dappTokenAddress, setDappTokenAddress] = useState(null);
  const [usdTokenAddress, setUsdTokenAddress] = useState(null);
  const ammState = useSelector(state => state.amm.contract);

  const tokens = useSelector((state) => state.tokens.contracts);
  const [amms, setAmms] =  useState([]);
  const [currentAMMSwaps, setCurrentAMMSwaps] = useState([]);
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const [swapHistory, setSwapHistory] = useState([]);
  const user = loadAccount;
  const account = useSelector(state => state.provider.account)



  if (!provider) {
    console.warn('Provider is not available. Ensure wallet is connected.');
  }
  const network = provider.getNetwork();
   console.log("Connected to network:", network);

  const dispatch = useDispatch();
  
  const loadBlockchainData = async () => {
    try {
      console.log('Initializing provider...');
      const provider = await loadProvider(dispatch);
      console.log('Provider initialized:', provider);
  
      const chainId = await loadNetwork(provider, dispatch);
      console.log('Current chain ID:', chainId);
  
      window.ethereum.on('chainChanged', () => {
        console.log('Chain changed, reloading...');
        window.location.reload();
      });
  
      window.ethereum.on('accountsChanged', async () => {
        console.log('Accounts changed, reloading account...');
        await loadAccount(dispatch);
      });
  
      console.log('Loading AMM contracts...');
      const amms = await loadAMM(provider, chainId, dispatch);
      if (amms && amms.length > 0) {
        setAmms(amms);
        amms.forEach((amm, index) => {
          console.log(`Loaded AMM Contract ${index + 1}:`, amm.address);
        });
      } else {
        console.log('No AMM contracts loaded.');
      }
  
      console.log('Loading token and AMM addresses from config.json...', config);
      const tokenAddresses = config[chainId];
      if (tokenAddresses) {
        const dappTokenAddress = tokenAddresses.dapp?.address;
        const usdTokenAddress = tokenAddresses.usd?.address;
        if (dappTokenAddress && usdTokenAddress) {
          console.log('Loading tokens...');
          const tokens = await loadTokens(provider, chainId, dispatch);
          console.log('Tokens loaded successfully:', tokens);
        } else {
          console.error('Token addresses missing in config.');
        }
      } else {
        console.error(`No token configuration found for chainId ${chainId}`);
      }
  
      setDexes(dexesData);
      const allSwaps = [];
      for (const amm of amms) {
        const swaps = await fetchSwapsForAMM(amm.address);
        allSwaps.push(...swaps);
      }
      setCurrentAMMSwaps(allSwaps);
    } catch (error) {
      console.error('Error in handleSwalockchainData:', error);
    }
  };
  

  const fetchAndSetSwaps = async (ammAddress) => {
    console.log("ammAddress ========", ammAddress)
    const swaps = await fetchSwapsForAMM(ammAddress);
    setCurrentAMMSwaps(swaps);
  };

  const fetchAllSwaps = async () => {
    try {
      let allSwaps = [];
      for (const amm of amms) {
        if (amm && amm.address) {
          const swaps = await fetchSwapsForAMM(amm.address);
          if (Array.isArray(swaps)) {
            allSwaps = [...allSwaps, ...swaps];
          }
        } else {
          console.warn("Skipping undefined AMM or missing address:", amm);
        }
      }
      setSwapHistory(allSwaps);
      setCurrentAMMSwaps(allSwaps); // Aktualizuj currentAMMSwaps, aby od razu wyświetlić historię
    } catch (error) {
      console.error('Error fetching all swaps:', error);
    }
  };
  
  

  const inputHandler = async (e) => {
    const inputValue = e.target.value;
    if (!inputValue) {
      setOutputAmount('');
      return;
    }
  
    if (!tokenIn || !tokenOut) {
      setAlertMessage('Please select tokens.');
      setShowAlert(true);
      return;
    }
  
    if (tokenIn === tokenOut) {
      setAlertMessage('Invalid token pair. Please select different tokens.');
      setShowAlert(true);
      return;
    }
  
    try {
      const parsedInputAmount = ethers.utils.parseUnits(inputValue, 'ether');
      const ammContract = new ethers.Contract(bestDex.ammAddress, AMM_ABI, provider);
      ammContract.on("Swap", (user, tokenIn, amountIn, tokenOut, amountOut) => {
        console.log("Swap event detected:", { user, tokenIn, amountIn, tokenOut, amountOut });
    });
      const result =
        tokenIn === 'DAPP'
          ? await ammContract.calculateToken1Swap(parsedInputAmount)
          : await ammContract.calculateToken2Swap(parsedInputAmount);
  
      setOutputAmount(ethers.utils.formatUnits(result, 'ether'));
      setAmountIn(inputValue);
    } catch (error) {
      console.error('Error in inputHandler:', error);
      setAlertMessage('Error calculating swap output. Check console for details.');
      setShowAlert(true);
    }
  };
  
  
  
 useEffect(() => {
  console.log('Tokens loaded from Redux:', tokens);
  loadBlockchainData();

  console.log('Initializing DEX data and GLPK instance...');

  glpk()
    .then((instance) => {
      console.log('GLPK instance initialized:', instance);
      setGlpkInstance(instance);
    })
    .catch((error) => {
      console.error('Error initializing GLPK instance:', error);
    });
}, []);

useEffect(() => {
  if (amms.length > 0) {
    fetchAllSwaps(); // Pobierz historię swapów dla wszystkich AMM-ów po ich załadowaniu
  }
}, [amms]);


  useEffect(() => {
    if (bestDex) {
      fetchAndSetSwaps(bestDex.ammAddress); // Pobiera historię dla wybranego AMM
    }
  }, [bestDex]);

  useEffect(() => {
    if (currentAMMSwaps && currentAMMSwaps.length > 0) {
      const uniqueSwaps = [...new Map(currentAMMSwaps.map(swap => [swap.timestamp, swap])).values()];
      if (JSON.stringify(uniqueSwaps) !== JSON.stringify(currentAMMSwaps)) {
        setCurrentAMMSwaps(uniqueSwaps);
      }
    }
  }, [currentAMMSwaps]);
  
  
  

  const handleOptimize = async () => {
    if (glpkInstance) {
      await optimizeDexSplit({
        glpkInstance,
        dexesData,
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

  const handleSwap = async () => {
    console.log('Initiating swap...');
  
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
      const tokenAddresses = config[chainId];
  
      if (!tokenAddresses) {
        console.error(`No token configuration found for chainId ${chainId}`);
        return;
      }
  
      const dappTokenAddress = tokenAddresses.dapp.address;
      const usdTokenAddress = tokenAddresses.usd.address;
      const tokenInAddress = tokenIn === 'DAPP' ? dappTokenAddress : usdTokenAddress;
  
      console.log('Token in address:', tokenInAddress);
      console.log('Selected AMM contract address:', bestDex.ammAddress);
      console.log("Tokens=====", tokens);
  
      let transaction;
      if (tokenIn === 'DAPP') {
        console.log('TokenIn is DAPP, proceeding with swap...');
        transaction = await swap(provider, bestDex, tokens[0], tokenIn, amountIn, dispatch);
      } else {
        console.log('TokenIn is not DAPP, proceeding with alternative swap...');
        transaction = await swap(provider, bestDex, tokens[1], tokenIn, amountIn, dispatch);
      }
  
      if (!transaction) {
        console.warn('Swap aborted: transaction failed.');
        setAlertMessage('Swap failed.');
        setIsSwapping(false);
        setShowAlert(true);
        return;
      }
  
      // Wait for transaction confirmation
      await transaction.wait();
      console.log('Swap transaction confirmed:', transaction.hash);
      setAlertMessage('Swap completed successfully!');
      await loadBalances(provider, bestDex, tokens, account, dispatch);
  
      // Add swap to history
      const swapData = {
        user,
        tokenGive: tokenIn,
        tokenGiveAmount: amountIn,
        tokenGet: tokenOut,
        tokenGetAmount: outputAmount,
        dexName: bestDex.name,
        timestamp: new Date().toISOString(),
      };
  
      console.log('Swap data being sent:', swapData);
      addSwapToAMM(bestDex.ammAddress, swapData);
    } catch (error) {
      console.error('Error during the swap:', error);
      setAlertMessage('Error during the swap: ' + error.message);
    } finally {
      setIsSwapping(false);
      setShowAlert(true);
    }
  };

  const fetchSwapsForAMM = async (ammAddress) => {
    if (!ammAddress) {
      console.error("fetchSwapsForAMM called with undefined address");
      return [];
    }

    try {
      const swaps = currentAMMSwaps.filter(swap => swap.ammAddress === ammAddress);
      console.log("Fetched swaps for AMM from state:", ammAddress, swaps);
      return Array.isArray(swaps) ? swaps : [];
    } catch (error) {
      console.error("Error fetching swaps for AMM from state:", error);
      return [];
    }
  };

  const addSwapToAMM = (ammAddress, swapData) => {
    try {
      setCurrentAMMSwaps(prevSwaps => [...prevSwaps, { ...swapData, ammAddress }]);
      console.log('Swap added to AMM:', swapData);
    } catch (error) {
      console.error('Error adding swap to AMM:', error);
      throw error;
    }
  };

  // Handler functions for weight adjustment
  const handlePricePriority = () => {
    setPriceWeight(50);
    setFeeWeight(30);
    setLiquidityWeight(20);
    setActivePriority('Price');
  };

  const handleFeePriority = () => {
    setPriceWeight(30);
    setFeeWeight(50);
    setLiquidityWeight(20);
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
      <Navigation />
      <Routes>
        <Route
          path="/"
          element={
            <>
              <div className="my-3 text-center">
                <img alt="logo" src={logo} width="200" height="200" className="mx-2" />

                <Button
                  variant="primary"
                  onClick={handlePricePriority}
                  className={`mx-2 ${activePriority === 'Price' ? 'text-warning' : ''}`}
                >
                  Price Priority
                </Button>

                <Button
                  variant="primary"
                  onClick={handleFeePriority}
                  className={`mx-2 ${activePriority === 'Fee' ? 'text-warning' : ''}`}
                >
                  Fee Priority
                </Button>

                <Button
                  variant="primary"
                  onClick={handleLiquidityPriority}
                  className={`mx-2 ${activePriority === 'Liquidity' ? 'text-warning' : ''}`}
                >
                  Liquidity Priority
                </Button>
              </div>

              <SwapForm
  amountIn={amountIn}
  setAmountIn={setAmountIn}
  tokenIn={tokenIn}
  setTokenIn={setTokenIn}
  tokenOut={tokenOut}
  setTokenOut={setTokenOut}
  outputAmount={outputAmount}
  availableLiquidity={availableLiquidity}
  isSwapping={isSwapping}
  handleSwap={handleSwap}
  handleOptimize={handleOptimize}
  inputHandler={inputHandler}
  provider={provider}
  dexesData={dexesData}
  setOutputAmount={setOutputAmount} // <-- Pass setOutputAmount to SwapForm
/>

              {showAlert && (
                <div className="relative w-full h-full">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <Alert variant="info" className="text-center" onClose={() => setShowAlert(false)} dismissible>
                      {alertMessage}
                    </Alert>
                  </div>
                </div>
              )}

              <DexTable dexesData={dexesData} highlightedDex={highlightedDex} />

              {/* Dodano sekcję Swap History */}
              <div className="mt-5">
                <h3>Swap History</h3>
                <Table striped bordered hover className="text-center">
                  <thead className="text-center">
                    <tr>
                      <th>User</th>
                      <th>AMM</th>
                      <th>Token Give</th>
                      <th>Amount Give</th>
                      <th>Token Get</th>
                      <th>Amount Get</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(currentAMMSwaps) && currentAMMSwaps.length > 0 ? (
                      currentAMMSwaps.map((swap, index) => {
                        console.log('Rendering swap:', swap); // Dodano logowanie swapów
                        return (
                          <tr key={index} className="align-middle">
                            <td>{swap.user}</td>
                            <td>{swap.dexName}</td>
                            <td>{swap.tokenGive}</td>
                            <td>{swap.tokenGiveAmount}</td>
                            <td>{swap.tokenGet}</td>
                            <td>{swap.tokenGetAmount}</td>
                            <td>{swap.timestamp}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="7">No swaps available</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
              {/* Koniec sekcji Swap History */}
            </>
          }
        />
        <Route path="/amm/:ammId" element={<AmmDetails amms={amms} />} />
      </Routes>
    </div>
  );
}

export default App;
