// App.js
import React, { useState, useEffect } from 'react';
import config from '../config.json';
import dexesData from '../dexes.json';
import Navigation from './Navigation';
import glpk from 'glpk.js';
import './App.css';
import AMM_ABI from '../abis/AMM.json';
import { useSelector, useDispatch } from 'react-redux';
import { BrowserProvider, Contract, parseUnits } from 'ethers';
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
import {
  swap,
  loadProvider,
  loadNetwork,
  loadAccount,
  loadTokens,
  loadAMM,
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
  const [provider, setProvider] = useState(null);
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

  const tokens = useSelector((state) => state.tokens.contracts);
  const amms = useSelector((state) => state.amm.contracts);
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
        amms.forEach((amm, index) => {
          console.log(`Loaded AMM Contract ${index + 1}:`, amm.address);
        });
      } else {
        console.log('No AMM contracts loaded.');
      }

      console.log('Loading token and AMM addresses from config.json...');
      const tokenAddresses = config[chainId];
      console.log('All token addresses:', tokenAddresses);

      const dappTokenAddress = tokenAddresses?.dapp?.address;
      const usdTokenAddress = tokenAddresses?.usd?.address;

      if (dappTokenAddress && usdTokenAddress) {
        console.log('Loading tokens...');
        const tokens = await loadTokens(provider, chainId, dispatch);
        console.log('Tokens loaded successfully:');
        tokens.forEach((token, index) => {
          console.log(`Token ${index + 1}:`);
          console.log(`  Address: ${token.address}`);
        });
      } else {
        console.error(
          `Token addresses for DAPP or USD are missing in config for chainId ${chainId}`
        );
      }

      setDexes(dexesData);
    } catch (error) {
      console.error('Error in loadBlockchainData:', error);
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
      const chainId = await loadNetwork(provider, dispatch);
      const tokenAddresses = config[chainId];
      if (!tokenAddresses) {
        console.error(`No token configuration found for chainId ${chainId}`);
        return;
      }

      const dappTokenAddress = tokenAddresses.dapp.address;
      const usdTokenAddress = tokenAddresses.usd.address;
      const tokenInAddress = tokenIn === 'DAPP' ? dappTokenAddress : usdTokenAddress;
      console.log('Token in address tokenInAddress:', tokenInAddress);
      console.log('Selected AMM contract address:', bestDex.ammAddress);

      let tx;
      if (tokenIn === 'DAPP') {
        console.log('TokenIn is DAPP, proceeding with swap...');
        await swap(provider, bestDex, tokens[0], tokenIn, amountIn, dispatch);
      } else {
        console.log('TokenIn is not DAPP, proceeding with alternative swap...');
        await swap(provider, bestDex, tokens[1], tokenIn, amountIn, dispatch);
      }

      console.log('Transaction sent. Waiting for confirmation...');
      setAlertMessage('Swap completed successfully!');
    } catch (error) {
      console.error('Error during the swap:', error);
      setAlertMessage('Error during the swap: ' + error.message);
    } finally {
      setIsSwapping(false);
      setShowAlert(true);
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
                availableLiquidity={null}
                isSwapping={isSwapping}
                handleSwap={handleSwap}
                optimizeDexSplit={null}
                handleOptimize={handleOptimize}
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
            </>
          }
        />
        <Route path="/amm/:ammId" element={<AmmDetails amms={amms} />} />

      </Routes>
    </div>
  );
}

export default App;
