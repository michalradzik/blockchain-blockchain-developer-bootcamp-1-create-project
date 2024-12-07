import React, { useState, useEffect } from 'react';
import { Button, Alert, Table } from 'react-bootstrap';

import Navigation from './Navigation';
import glpk from 'glpk.js';
import './App.css';
import { ethers } from 'ethers';
import SwapForm from './SwapForm';
import DexTable from './DexTable';
import backgroundImage from '../background16.jpeg';
import logo from '../logo.png';
import RegistryArtifact from '../abis/Registry.json';
import DexAggregatorArtifact from '../abis/DexAggregator.json';
import Token from '../abis/Token.json';
import { useSelector, useDispatch } from 'react-redux';
import { optimizeDexSplit } from './optimizeDexSplit';
import { Routes, Route, Link } from 'react-router-dom';
import AmmDetails from './AmmDetails';
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
  const [amms, setAmms] =  useState([]);
  const [currentAMMSwaps, setCurrentAMMSwaps] = useState([]);
  const [networkName, setNetworkName] = useState('');

  const ammState = useSelector(state => state.amm.contract);

  //const tokens = useSelector((state) => state.tokens.contracts);

  const provider = useSelector((state) => loadProvider);
  const [swapHistory, setSwapHistory] = useState([]);
  const account = useSelector(state => state.provider.account)
 
  if (!provider) {
    console.warn('Provider is not available. Ensure wallet is connected.');
  }
  

  const dispatch = useDispatch();

  const user = loadAccount;
  useEffect(() => {
    glpk()
      .then((instance) => {
        setGlpkInstance(instance);
        console.log('GLPK instance initialized:', instance);
      })
      .catch((error) => console.error('Error initializing GLPK:', error));
  }, []);

  const initializeTokens = async (provider, dexAggregator, chainId, dispatch) => {
    try {
      console.log('Loading tokens...');
      const tokens = await loadTokens(provider, dexAggregator, dispatch);
  
      // Przypisz instancje kontraktów do stałej
      const [dappToken, usdToken] = tokens;
  
      console.log('DAPP Token Contract:', dappToken);
      console.log('USD Token Contract:', usdToken);
  
      // Możesz teraz użyć tych instancji kontraktów w swoim kodzie
    //  const dappSymbol = await dappToken.symbol();
      // const usdSymbol = await usdToken.symbol();
  
      //console.log(`Loaded tokens: ${dappSymbol} and ${usdSymbol}`);
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  };
  
  // Wywołanie w `useEffect` lub innej funkcji
/*   useEffect(() => {
    //const chainId = await loadNetwork(provider, dispatch);
    initializeTokens(provider, chainId, dispatch);
  }, []); */

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
  


    useEffect(() => {
      const loadBlockchainData = async () => {
        try {
          console.log('Initializing provider...');
          const provider = await loadProvider(dispatch);
          console.log('Provider initialized:', provider);
      
          const { chainId, networkName } = await loadNetwork(provider, dispatch);
          console.log(`Connected to network: ${networkName} (Chain ID: ${chainId})`);
          setNetworkName(networkName)
      
          
      
    
          const registryAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Replace with deployed Registry address
          const registry = new ethers.Contract(registryAddress, RegistryArtifact.abi, provider);
          console.log('Registry loaded:', registry);
    
          // Retrieve DexAggregator address
          const dexAggregatorAddress = await registry.getAddress('DexAggregator').catch((error) => {
            console.error('Error fetching DexAggregator address:', error.message);
            throw new Error('DexAggregator not found in the registry.');
          });
    
          if (!dexAggregatorAddress || dexAggregatorAddress === ethers.constants.AddressZero) {
            throw new Error('DexAggregator address is invalid.');
          }
    
          console.log('DexAggregator address retrieved:', dexAggregatorAddress);
    
          const dexAggregatorContract = new ethers.Contract(
            dexAggregatorAddress,
            DexAggregatorArtifact.abi,
            provider
          );
          setDexAggregator(dexAggregatorContract);
          console.log('DexAggregator contract loaded:', dexAggregatorContract);
          initializeTokens(provider, dexAggregatorContract, chainId, dispatch);
          // Fetch tokens
          const fetchedTokens = await dexAggregatorContract.getTokens();
          const formattedTokens = fetchedTokens.map(([name, symbol, tokenAddress]) => ({
            name: name || 'Unknown',
            symbol: symbol || 'UNK',
            tokenAddress: tokenAddress || ethers.constants.AddressZero,
          }));
          setTokens(formattedTokens);
          console.log('Fetched tokens:', formattedTokens);
    
          const fetchedAmms = await dexAggregatorContract.getDexes();
      console.log('Fetched AMMs from getDexes:', fetchedAmms);
      

      
          const formattedAmms = fetchedAmms.map(
            ([ammAddress, makerFee, takerFee, liquidityToken1, liquidityToken2, tokenIn, tokenOut], index) => {
              const token1 = parseFloat(ethers.utils.formatUnits(liquidityToken1 || ethers.BigNumber.from(0), 18));
              const token2 = parseFloat(ethers.utils.formatUnits(liquidityToken2 || ethers.BigNumber.from(0), 18));
              const price = token1 > 0 ? token2 / token1 : 0;
          
              return {
                ammAddress: ammAddress || '0x0',
                name: `AMM ${index + 1}`,
                makerFee: parseFloat(ethers.utils.formatUnits(makerFee || ethers.BigNumber.from(0), 4)),
                takerFee: parseFloat(ethers.utils.formatUnits(takerFee || ethers.BigNumber.from(0), 4)),
                liquidity: {
                  token1,
                  token2,
                },
                tokenInSymbol: tokenIn?.symbol || 'N/A',
                tokenOutSymbol: tokenOut?.symbol || 'N/A',
                tokenIn: tokenIn?.address || 'N/A',
                tokenOut: tokenOut?.address || 'N/A',
                price,
              };
            }
          );
          
          setAmms(formattedAmms)
          console.log('Formatted AMMs:', formattedAmms); // Debugowanie przekształconych danych
console.log('Fetched AMM data with prices:', formattedAmms);
      // Initialize GLPK
          glpk()
            .then((instance) => console.log('GLPK instance initialized:', instance))
            .catch((error) => console.error('Error initializing GLPK:', error));
        } catch (error) {
          console.error('Error loading blockchain data:', error);
          setAlertMessage(error.message || 'An error occurred while loading blockchain data.');
          setShowAlert(true);
        }
      };
    
      loadBlockchainData();
    }, []);
    
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
        const tokenAddresses = tokens;
    
        if (!tokenAddresses) {
          console.error(`No token configuration found for chainId ${chainId}`);
          return;
        }

        const dappTokenAddress = tokenAddresses[0].tokenAddress
        const usdTokenAddress = tokenAddresses[1].tokenAddress
        const tokenInAddress = tokenIn === 'DAPP' ? dappTokenAddress : usdTokenAddress;
    
        console.log('Token in address:', tokenInAddress);
        console.log('Selected AMM contract address:', bestDex.ammAddress);
        console.log("Tokens=====", tokens);
    
        let transaction;
        if (tokenIn === 'DAPP') {
          console.log('TokenIn is DAPP, proceeding with swap...');
          console.log('TokenIn is DAPP, proceeding with tokenAddresses[0]...',tokenAddresses[0]);
         // const tokenContract = new ethers.Contract(token.tokenAddress, ERC20_ABI, signer);
         const tokenContract = initializeToken(provider, tokenInAddress);
         console.log("Tokens contract", tokenContract)
          transaction = await swap(provider, bestDex, tokenContract, tokenIn, amountIn, dispatch);
        } else {
          console.log('TokenIn is not DAPP, proceeding with alternative swap...');
          console.log('TokenIn is DAPP, proceeding with tokenAddresses[1]...',tokenAddresses[1]);
          transaction = await swap(provider, bestDex, tokenAddresses[1], tokenIn, amountIn, dispatch);
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
          transactionHash: transaction.hash,
        };
    
        console.log('Swap data being sent:', swapData);
        addSwapToAMM(bestDex.ammAddress, swapData);
        setSwapHistory(bestDex.ammAddress, swapData)
      } catch (error) {
        console.error('Error during the swap:', error);
        setAlertMessage('Error during the swap: ' + error.message);
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
    const addSwapToAMM = (ammAddress, swapData) => {
      try {
        setCurrentAMMSwaps(prevSwaps => [...prevSwaps, { ...swapData, ammAddress }]);
        console.log('Swap added to AMM:', swapData);
      } catch (error) {
        console.error('Error adding swap to AMM:', error);
        throw error;
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
        {/* Dodanie komponentu Navigation */}
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
    
                <div className="mt-5">
                  <h3>Swap History</h3>
                  <Table striped bordered hover className="text-center">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>AMM</th>
                        <th>Token Give</th>
                        <th>Amount Give</th>
                        <th>Token Get</th>
                        <th>Amount Get</th>
                        <th>Timestamp</th>
                        <th>Transaction Hash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentAMMSwaps.length > 0 ? (
                        currentAMMSwaps.map((swap, index) => (
                          <tr key={index}>
                            <td>{swap.user}</td>
                            <td>{swap.dexName}</td>
                            <td>{swap.tokenGive}</td>
                            <td>{swap.tokenGiveAmount}</td>
                            <td>{swap.tokenGet}</td>
                            <td>{swap.tokenGetAmount}</td>
                            <td>{swap.timestamp}</td>
                            <td>
                              <a
                                href={`https://sepolia.etherscan.io/tx/${swap.transactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {swap.transactionHash.slice(0, 10)}...
                              </a>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8">No swaps available</td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </>
            }
          />
          <Route path="/amm/:ammId" element={<AmmDetails amms={amms} />} />
        </Routes>
      </div>
    );
  }    

export default App;
