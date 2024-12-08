import React from 'react';
import { Button } from 'react-bootstrap';
import logo from '../logo.png';

const PriorityButtons = ({ 
  activePriority, 
  handlePricePriority, 
  handleFeePriority, 
  handleLiquidityPriority 
}) => {
  return (
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
  );
};

export default PriorityButtons;
