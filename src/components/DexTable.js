// DexTable.js
import React from 'react';
import { Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './App.css'; // Upewnij się, że importujesz odpowiedni plik CSS

const DexTable = ({ dexesData, highlightedDex }) => {
  console.log('Highlighted Index:', highlightedDex);

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
            <th className="table-header">Liquidity</th>
            <th className="table-header">Fee</th>
            <th className="table-header">Details</th>
          </tr>
        </thead>
        <tbody>
          {dexesData.map((dex, index) => (
            <tr
              key={index}
              className={highlightedDex === index ? 'highlighted-row' : ''}
            >
              <td className="table-cell">{dex.name}</td>
              <td className="table-cell">{dex.price}</td>
              <td className="table-cell">{dex.liquidity.token1}</td>
              <td className="table-cell">{dex.fee.taker}</td>
              <td className="table-cell">
                <Link to={`/amm/${index}`} className="details-link">
                  Go to details
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default DexTable;
