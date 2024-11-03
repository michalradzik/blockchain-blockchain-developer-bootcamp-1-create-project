// components/AmmDetails.js
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Button } from 'react-bootstrap';
import dexesData from '../dexes.json';
import Withdraw from './Withdraw';
import Deposit from './Deposit';

const AmmDetails = () => {
  const { ammId } = useParams();
  const navigate = useNavigate();
  const amm = dexesData[ammId];

  if (!amm) {
    return <p>AMM o podanym ID nie istnieje</p>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Szczegóły AMM: {amm.name}</h2>

      <Table bordered>
        <tbody>
          <tr>
            <td><strong>Adres:</strong></td>
            <td>{amm.ammAddress}</td>
          </tr>
          <tr>
            <td><strong>Token In:</strong></td>
            <td>{amm.tokenInSymbol} ({amm.tokenIn})</td>
          </tr>
          <tr>
            <td><strong>Token Out:</strong></td>
            <td>{amm.tokenOutSymbol} ({amm.tokenOut})</td>
          </tr>
          <tr>
            <td><strong>Cena:</strong></td>
            <td>{amm.price}</td>
          </tr>
          <tr>
            <td><strong>Płynność (Token1):</strong></td>
            <td>{amm.liquidity.token1}</td>
          </tr>
          <tr>
            <td><strong>Płynność (Token2):</strong></td>
            <td>{amm.liquidity.token2}</td>
          </tr>
          <tr>
            <td><strong>Opłata dla twórcy:</strong></td>
            <td>{amm.fee.maker}</td>
          </tr>
          <tr>
            <td><strong>Opłata dla wykonawcy:</strong></td>
            <td>{amm.fee.taker}</td>
          </tr>
        </tbody>
      </Table>

      <Button variant="primary" onClick={() => navigate(-1)} className="mb-4">Powrót</Button>

      {/* Include Withdraw and Deposit components */}
      <div className="my-4">
        <h4>Withdraw</h4>
        <Withdraw />
      </div>

      <div className="my-4">
        <h4>Deposit</h4>
        <Deposit />
      </div>
    </div>
  );
};

export default AmmDetails;
