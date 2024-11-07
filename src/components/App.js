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
import ReactDOM from "react-dom/client";
import {
    swap,
    loadBalances,
    loadProvider,
    loadNetwork,
    loadAccount,
    loadTokens,
    loadAMM
} from '../store/interactions';
import { Button, DropdownButton, Dropdown, Form, InputGroup, Spinner, Card, Row, Col, Alert, Table } from 'react-bootstrap';

function App() {
    const [provider, setProvider] = useState(null);
    const [priceWeight, setPriceWeight] = useState(50);
    const [feeWeight, setFeeWeight] = useState(30);
    const [liquidityWeight, setLiquidityWeight] = useState(20);
    const [amountIn, setAmountIn] = useState("");
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

    const tokens = useSelector(state => state.tokens.contracts);
    const amms = useSelector(state => state.amm.contracts);
    const dispatch = useDispatch();

    const loadBlockchainData = async () => {
        try {
            console.log("Initializing provider...");
            const provider = await loadProvider(dispatch);
            console.log("Provider initialized:", provider);

            const chainId = await loadNetwork(provider, dispatch);
            console.log("Current chain ID:", chainId);

            window.ethereum.on('chainChanged', () => {
                console.log("Chain changed, reloading...");
                window.location.reload();
            });

            window.ethereum.on('accountsChanged', async () => {
                console.log("Accounts changed, reloading account...");
                await loadAccount(dispatch);
            });

            console.log("Loading AMM contracts...");
            const amms = await loadAMM(provider, chainId, dispatch);

            if (amms && amms.length > 0) {
                amms.forEach((amm, index) => {
                    console.log(`Loaded AMM Contract ${index + 1}:`, amm.address);
                });
            } else {
                console.log("No AMM contracts loaded.");
            }

            console.log("Loading token and AMM addresses from config.json...");
            const tokenAddresses = config[chainId];
            console.log("All token addresses:", tokenAddresses);

            const dappTokenAddress = tokenAddresses?.dapp?.address;
            const usdTokenAddress = tokenAddresses?.usd?.address;

            if (dappTokenAddress && usdTokenAddress) {
                console.log("Loading tokens...");
                const tokens = await loadTokens(provider, chainId, dispatch);
                console.log("Tokens loaded successfully:");
                tokens.forEach((token, index) => {
                    console.log(`Token ${index + 1}:`);
                    console.log(`  Address: ${token.address}`);
                });
            } else {
                console.error(`Token addresses for DAPP or USD are missing in config for chainId ${chainId}`);
            }

            setDexes(dexesData);
        } catch (error) {
            console.error("Error in loadBlockchainData:", error);
        }
    };

    useEffect(() => {
        console.log("Tokens loaded from Redux:", tokens);
        loadBlockchainData();
        console.log("Initializing DEX data and GLPK instance...");

        glpk().then(instance => {
            console.log("GLPK instance initialized:", instance);
            setGlpkInstance(instance);
        }).catch(error => {
            console.error("Error initializing GLPK instance:", error);
        });
    }, []);

    const optimizeDexSplit = async () => {
        console.log("Starting optimization...");
    
        if (!glpkInstance) {
            console.error("GLPK instance is not initialized.");
            setAlertMessage("Optimization failed: GLPK not initialized");
            setShowAlert(true);
            return;
        }
    
        try {
            console.log("Calculating optimization variables...");
    
            const vars = dexes.map((dex, index) => {
                const rate = dex.price || 0;
                const fee = dex.fee?.taker || 0;
                const liquidity = dex.liquidity?.token1 || 0;
                const coef = (rate * priceWeight / 100) - (fee * feeWeight / 100) + (liquidity * liquidityWeight / 100);
                console.log(`DEX ${dex.name} (Index ${index}) - Price: ${rate}, Fee: ${fee}, Liquidity: ${liquidity}, Coefficient: ${coef}`);
                return { name: `x${index}`, coef: coef > 0 ? coef : 0.001 };
            });
    
            console.log("Optimization variables:", vars);
    
            const lp = {
                name: 'dexOptimization',
                objective: { direction: glpkInstance.GLP_MIN, vars },
                subjectTo: [
                    {
                        name: 'selectionConstraint',
                        vars: vars.map(v => ({ name: v.name, coef: 1 })),
                        bnds: { type: glpkInstance.GLP_FX, lb: 1, ub: 1 } 
                    }
                ]
            };
    
            console.log("Linear programming problem setup:", lp);
    
            const result = await glpkInstance.solve(lp);
            console.log("Pełny wynik z GLPK:", JSON.stringify(result, null, 2));
            console.log("Optimization result:", result);
    
            if (!result || !result.result || !result.result.vars) {
                console.error("GLPK returned an invalid result structure:", result);
                setAlertMessage("Optimization failed: Invalid result from GLPK");
                setShowAlert(true);
                return;
            }
    
            const bestDexIndex = Object.entries(result.result.vars).reduce((best, [key, value]) => {
                console.log(`Variable ${key} has value: ${value}`);
                return value > best.value ? { index: parseInt(key.replace('x', '')), value } : best;
            }, { index: -1, value: 0 }).index;
    
            if (bestDexIndex >= 0) {
                setBestDex(dexes[bestDexIndex]);
                setHighlightedDex(bestDexIndex);
                console.log("Optimization completed. Best DEX:", dexes[bestDexIndex]);
    
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
    
    

    const handleSwap = async () => {
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
            const tokenInAddress = tokenIn === "DAPP" ? dappTokenAddress : usdTokenAddress; 
            console.log("Token in address tokenInAddress:", tokenInAddress);
            console.log("Selected AMM contract address:", bestDex);

            let tx;
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

    return (
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px' }}>
            <Navigation />
            <h1 style={{ color: '#343a40' }}>DEX Optimizer - Find the Best Exchange Rate</h1>

            <Routes>
                <Route path="/" element={
                    <>
                        <Card style={{ maxWidth: '450px', margin: '0 auto', padding: '20px', backgroundColor: '#ffffff' }}>
                            <Form>
                                <Row className='my-3'>
                                    <Button onClick={optimizeDexSplit} className="optimize">Optimize DEX</Button>
                                </Row>
                                <Row className='my-3'>
                                    <Form.Label><strong>Input Token:</strong></Form.Label>
                                    <InputGroup>
                                        <Form.Control
                                            type="number"
                                            placeholder="0.0"
                                            value={amountIn}
                                            onChange={(e) => setAmountIn(e.target.value)}
                                            disabled={!tokenIn}
                                        />
                                        <DropdownButton variant="outline-secondary" title={tokenIn || "Select Token"}>
                                            <Dropdown.Item onClick={() => setTokenIn('DAPP')}>Dapp Token</Dropdown.Item>
                                            <Dropdown.Item onClick={() => setTokenIn('USD')}>USD Token</Dropdown.Item>
                                        </DropdownButton>
                                    </InputGroup>
                                </Row>

                                <Row className='my-4'>
                                    <Form.Label><strong>Output Token:</strong></Form.Label>
                                    <InputGroup>
                                        <Form.Control
                                            type="number"
                                            placeholder="0.0"
                                            value={outputAmount || ""}
                                            disabled
                                        />
                                        <DropdownButton variant="outline-secondary" title={tokenOut || "Select Token"}>
                                            <Dropdown.Item onClick={() => setTokenOut('DAPP')}>Dapp Token</Dropdown.Item>
                                            <Dropdown.Item onClick={() => setTokenOut('USD')}>USD Token</Dropdown.Item>
                                        </DropdownButton>
                                    </InputGroup>
                                </Row>

                                <Row className='my-3'>
                                    <p>Available Liquidity: {availableLiquidity || 'N/A'}</p>
                                    {isSwapping ? (
                                        <Spinner animation="border" style={{ display: 'block', margin: '0 auto' }} />
                                    ) : (
                                        <Button onClick={handleSwap} className="swap">Swap</Button>
                                    )}
                                </Row>
                            </Form>
                        </Card>

                        {showAlert && (
                            <Alert variant="info" onClose={() => setShowAlert(false)} dismissible>
                                {alertMessage}
                            </Alert>
                        )}

                        {bestDex && (
                            <div className="my-3">
                                <h4>Best DEX Found:</h4>
                                <p>{bestDex.name}</p>
                            </div>
                        )}

                        <Table striped bordered hover className="my-3">
                            <thead>
                                <tr>
                                    <th>DEX Name</th>
                                    <th>Price</th>
                                    <th>Liquidity</th>
                                    <th>Fee</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dexes.map((dex, index) => (
                                    <tr key={index} className={highlightedDex === index ? "table-primary" : ""}>
                                        <td>{dex.name}</td>
                                        <td>{dex.price}</td>
                                        <td>{dex.liquidity.token1}</td>
                                        <td>{dex.fee.taker}</td>
                                        <td>
                                            <Link to={`/amm/${index}`}>Szczegóły</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </>
                } />
                <Route path="/amm/:ammId" element={<AmmDetails />} />
            </Routes>
        </div>
    );
}

export default App;
