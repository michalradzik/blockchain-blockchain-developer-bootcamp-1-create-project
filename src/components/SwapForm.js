// SwapForm.js
import React from 'react';
import { Button, DropdownButton, Dropdown, Form, InputGroup, Spinner, Card, Row } from 'react-bootstrap';

const SwapForm = ({
    amountIn,
    setAmountIn,
    tokenIn,
    setTokenIn,
    tokenOut,
    setTokenOut,
    outputAmount,
    availableLiquidity,
    isSwapping,
    handleSwap,
    optimizeDexSplit,
    handleOptimize
}) => {
    return (
        <Card style={{ maxWidth: '400px', maxHeight:'300', margin: '0 auto', padding: '20px', backgroundColor: '#ffffff' }}>
            <Form>
                <Row className='my-3'>
                    <Button onClick={handleOptimize} className="optimize">Optimize DEX</Button>
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
    );
};

export default SwapForm;
