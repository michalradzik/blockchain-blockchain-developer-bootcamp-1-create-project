import React from 'react';
import { Table } from 'react-bootstrap';

const SwapHistory = ({ swapHistory }) => {
  return (
    <div className="swapHistory-table-container">
      <Table bordered hover size="sm" className="swap-history-table my-2 text-center">
        <thead>
          <tr>
            <th colSpan="8" className="swap-history-title">Swap History</th>
          </tr>
          <tr>
            <th className="table-header">User</th>
            <th className="table-header">AMM</th>
            <th className="table-header">Token Give</th>
            <th className="table-header">Amount Give</th>
            <th className="table-header">Token Get</th>
            <th className="table-header">Amount Get</th>
            <th className="table-header">Timestamp</th>
            <th className="table-header">Transaction Hash</th>
          </tr>
        </thead>
        <tbody>
          {swapHistory.length > 0 ? (
            swapHistory.map((swap, index) => (
              <tr key={index}>
                <td className="table-cell">{swap.user}</td>
                <td className="table-cell">{swap.ammName}</td>
                <td className="table-cell">{swap.tokenGive}</td>
                <td className="table-cell">{swap.tokenGiveAmount}</td>
                <td className="table-cell">{swap.tokenGet}</td>
                <td className="table-cell">{swap.tokenGetAmount}</td>
                <td className="table-cell">{swap.timestamp}</td>
                <td className="table-cell">
                  <a
                    href={`https://sepolia.etherscan.io/tx/${swap.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="details-link"
                  >
                    {swap.transactionHash.slice(0, 10)}...
                  </a>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="8" className="table-cell text-gray-500 italic">
                No swaps available
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
};

export default SwapHistory;
