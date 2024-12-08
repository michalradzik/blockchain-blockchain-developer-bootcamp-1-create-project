import React, { useState, useEffect } from 'react';
import { Button, DropdownButton, Dropdown, Form, InputGroup, Spinner, Card, Row } from 'react-bootstrap';
import { ethers, Contract } from 'ethers';
import AMM_ABI from '../abis/AMM.json';
import { useSelector } from 'react-redux';
const SwapForm = ({
  amountIn,
  setAmountIn,
  tokenIn,
  setTokenIn,
  tokenOut,
  setTokenOut,
  outputAmount,
  setOutputAmount,
  isSwapping,
  handleSwap,
  handleOptimize,
  dexesData
}) => {
  const [amm, setAmm] = useState(null);
  const provider = useSelector(state => state.provider.connection)
  const handleAmmSelect = (selectedAmm) => {
    setAmm(selectedAmm);
    console.log('Selected AMM:', selectedAmm);
  };

  const inputHandler = (e) => {
    setAmountIn(e.target.value);
  };
console.log('dexes=', dexesData)
  useEffect(() => {
    const calculateOutputAmount = async () => {
      if (!tokenIn || !tokenOut || !amm || !amountIn) {
        return;
      }

      if (tokenIn === tokenOut) {
        window.alert('Invalid token pair');
        return;
      }

      const parsedInputAmount = ethers.utils.parseUnits(amountIn, 'ether');
      try {
        console.log('Initializing AMM Contract with variables:', {
          amm,
          provider,
        });

        // Create an AMM contract instance
        const signer = provider.getSigner();
        const ammContract = new Contract(amm.ammAddress, AMM_ABI, signer);

        // Calculate output amount
        let result;
        if (tokenIn === 'DAPP') {
          result = await ammContract.calculateToken1Swap(parsedInputAmount);
        } else {
          result = await ammContract.calculateToken2Swap(parsedInputAmount);
        }

        const formattedOutputAmount = ethers.utils.formatUnits(result, 'ether');
        console.log('Output amount calculated:', formattedOutputAmount);
        setOutputAmount(formattedOutputAmount);
      } catch (error) {
        console.error('Error calculating output amount:', error);
        window.alert('Error calculating swap output. Check console for details.');
      }
    };

    calculateOutputAmount();
  }, [amountIn, tokenIn, tokenOut, amm, provider, setOutputAmount]);

  return (
    <Card style={{ maxWidth: '400px', margin: '0 auto', padding: '20px', backgroundColor: '#ffffff' }}>
      <Form>
        <Row className="my-3">
          <Button onClick={handleOptimize} className="optimize">
            Optimize DEX
          </Button>
        </Row>
        <Row className="my-3">
          <Form.Label>
            <strong>Select AMM:</strong>
          </Form.Label>
          <DropdownButton
            variant="outline-secondary"
            title={amm && amm.name ? amm.name : 'Select AMM'}
          >
            {dexesData && Array.isArray(dexesData) && dexesData.length > 0 ? (
              dexesData.map((dex, index) => (
                <Dropdown.Item key={index} onClick={() => handleAmmSelect(dex)}>
                  {dex.name || dex.ammAddress}
                </Dropdown.Item>
              ))
            ) : (
              <Dropdown.Item disabled>No AMMs available</Dropdown.Item>
            )}
          </DropdownButton>
        </Row>
        <Row className="my-3">
          <Form.Label>
            <strong>Input Token:</strong>
          </Form.Label>
          <InputGroup>
            <Form.Control
              type="number"
              placeholder="0.0"
              value={amountIn}
              onChange={(e) => inputHandler(e)}
            />
            <DropdownButton variant="outline-secondary" title={tokenIn || 'Select Token'}>
              <Dropdown.Item onClick={() => setTokenIn('DAPP')}>Dapp Token</Dropdown.Item>
              <Dropdown.Item onClick={() => setTokenIn('USD')}>USD Token</Dropdown.Item>
            </DropdownButton>
          </InputGroup>
        </Row>

        <Row className="my-4">
          <Form.Label>
            <strong>Output Token:</strong>
          </Form.Label>
          <InputGroup>
            <Form.Control
              type="number"
              placeholder="0.0"
              min="0.0"
              step="any"
              value={outputAmount || ''}
              readOnly
            />
            <DropdownButton
              variant="outline-secondary"
              title={tokenOut ? tokenOut : 'Select Token'}
            >
              <Dropdown.Item onClick={() => setTokenOut('DAPP')}>Dapp Token</Dropdown.Item>
              <Dropdown.Item onClick={() => setTokenOut('USD')}>USD Token</Dropdown.Item>
            </DropdownButton>
          </InputGroup>
        </Row>

        <Row className="my-3">
          {isSwapping ? (
            <Spinner animation="border" style={{ display: 'block', margin: '0 auto' }} />
          ) : (
            <Button onClick={handleSwap} className="swap">
              Swap
            </Button>
          )}
        </Row>
      </Form>
    </Card>
  );
};

export default SwapForm;

