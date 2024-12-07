import React from 'react';
import { Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './App.css'; // Importuj swoje style CSS

const DexTable = ({ amms, highlightedDex }) => {
  console.log('DexTable received amms:', amms);
  console.log('highlightedDex:', highlightedDex);

  if (!amms || amms.length === 0) {
    return <p className="text-center text-gray-500">No AMMs available</p>;
  }

  // Dynamiczne nazwy tokenów
  const token1Name = 'DAPP'; // Możesz zaktualizować, jeśli masz dynamiczne dane
  const token2Name = 'USD';

  return (
    <div className="dex-table-container">
      <Table
        bordered
        hover
        size="sm" // Dodane aby zmniejszyć rozmiar tabeli
        className="my-2 text-center"
      >
        <thead>
          <tr>
            <th className="table-header">AMM Name</th>
            <th className="table-header">Price</th>
            <th className="table-header">{token1Name} Liquidity</th>
            <th className="table-header">{token2Name} Liquidity</th>
            <th className="table-header">Maker Fee</th>
            <th className="table-header">Taker Fee</th>
            <th className="table-header">Details</th>
          </tr>
        </thead>
        <tbody>
          {amms.map((amm, index) => {
            const price = amm.price ? amm.price.toFixed(4) : 'N/A';
            const makerFee = amm.makerFee?.toFixed(4) || 'N/A';
            const takerFee = amm.takerFee?.toFixed(4) || 'N/A';
            const liquidityToken1 = amm.liquidity?.token1?.toFixed(2) || 'N/A';
            const liquidityToken2 = amm.liquidity?.token2?.toFixed(2) || 'N/A';

            return (
              <tr
                key={index}
                className={highlightedDex === index ? 'highlighted-row' : ''}
              >
                <td className="table-cell">{amm.name || 'N/A'}</td>
                <td className="table-cell">{price}</td>
                <td className="table-cell">{liquidityToken1}</td>
                <td className="table-cell">{liquidityToken2}</td>
                <td className="table-cell">{makerFee}</td>
                <td className="table-cell">{takerFee}</td>
                <td className="table-cell">
                <Link to={`/amm/${index}`} className="details-link">
                  Go to details
                </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

export default DexTable;
