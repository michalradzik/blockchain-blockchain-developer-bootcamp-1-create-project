import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Button } from 'react-bootstrap';
import Withdraw from './Withdraw';
import Deposit from './Deposit';
import backgroundImage from '../background16.jpeg';

const AmmDetails = ({ amms }) => {
  const { ammId } = useParams();
  const navigate = useNavigate();
console.log("AmmDetails=", amms)
  // Pobieranie konkretnego AMM na podstawie ID
  const amm = amms ? amms[ammId] : null;

  if (!amm) {
    return (
      <p style={{ textAlign: 'center', color: 'red', fontWeight: 'bold' }}>
        The AMM with the specified ID does not exist.
      </p>
    );
  }

  return (
    <div
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '100vh',
        padding: '20px',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      <h2
        className="text-center mb-6"
        style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          color: 'white',
          backgroundColor: 'blue',
          padding: '10px',
          borderRadius: '8px',
        }}
      >
        AMM Details: {amm.name || 'Unknown'}
      </h2>

      <Table bordered>
        <tbody>
          <tr>
            <td className="table-cell"><strong>Address:</strong></td>
            <td className="table-cell">{amm.ammAddress || 'N/A'}</td>
          </tr>
          <tr>
            <td className="table-cell"><strong>Token In:</strong></td>
            <td className="table-cell">{amm.tokenInSymbol || 'N/A'} ({amm.tokenIn || 'N/A'})</td>
          </tr>
          <tr>
            <td className="table-cell"><strong>Token Out:</strong></td>
            <td className="table-cell">{amm.tokenOutSymbol || 'N/A'} ({amm.tokenOut || 'N/A'})</td>
          </tr>
          <tr>
            <td className="table-cell"><strong>Price:</strong></td>
            <td className="table-cell">{amm.price ? amm.price.toFixed(4) : 'N/A'}</td>
          </tr>
          <tr>
            <td className="table-cell"><strong>Liquidity (Token1):</strong></td>
            <td className="table-cell">{amm.liquidity?.token1 || 'N/A'}</td>
          </tr>
          <tr>
            <td className="table-cell"><strong>Liquidity (Token2):</strong></td>
            <td className="table-cell">{amm.liquidity?.token2 || 'N/A'}</td>
          </tr>
          <tr>
            <td className="table-cell"><strong>Maker Fee:</strong></td>
            <td className="table-cell">{amm.makerFee ? amm.makerFee.toFixed(4) : 'N/A'}</td>
          </tr>
          <tr>
            <td className="table-cell"><strong>Taker Fee:</strong></td>
            <td className="table-cell">{amm.takerFee ? amm.takerFee.toFixed(4) : 'N/A'}</td>
          </tr>
        </tbody>
      </Table>

      <Button variant="primary" onClick={() => navigate(-1)} className="mb-4">Back</Button>

      <div className="d-flex justify-content-between my-4">
        <div style={{ flex: 1, marginRight: '10px' }}>
          <h2
            style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: 'white',
              backgroundColor: 'blue',
              padding: '5px',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            Withdraw
          </h2>
          <Withdraw amm={amm} amms={amms} />
        </div>

        <div style={{ flex: 1, marginLeft: '10px' }}>
          <h4
            style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: 'white',
              backgroundColor: 'blue',
              padding: '5px',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            Deposit
          </h4>
          <Deposit amm={amm} amms={amms} />
        </div>
      </div>
    </div>
  );
};

export default AmmDetails;
