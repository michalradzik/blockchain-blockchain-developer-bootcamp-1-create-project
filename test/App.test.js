import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';

import App from '../src/components/App';


import glpk from 'glpk.js';

jest.mock('glpk.js', () => {
  return jest.fn().mockImplementation(() => {
    return {
      GLP_MAX: 1,
      solve: jest.fn((lp) => {
        return {
          result: {
            vars: {
              x0: 0.2,
              x1: 0.8,
            },
          },
        };
      }),
    };
  });
});

describe('optimizeDexSplit', () => {
  test('wybiera najlepszy DEX na podstawie ceny, opłat i płynności', async () => {
    render(<App />);

    fireEvent.click(screen.getByText('Optimize DEX'));

    await waitFor(() => {
      const bestDex = screen.getByText(/Best DEX: DEX_2/i);
      expect(bestDex).toBeInTheDocument();
    });
  });

  test('pokazuje komunikat błędu, gdy instancja GLPK jest niezainicjalizowana', async () => {
    glpk.mockImplementationOnce(() => null);

    render(<App />);

    fireEvent.click(screen.getByText('Optimize DEX'));

    await waitFor(() => {
      const alert = screen.getByText(/Optimization failed: GLPK not initialized/i);
      expect(alert).toBeInTheDocument();
    });
  });

  test('pokazuje komunikat błędu, gdy optymalizacja nie znajduje odpowiedniego DEX', async () => {
    glpk.mockImplementation(() => ({
      GLP_MAX: 1,
      solve: jest.fn(() => ({
        result: {
          vars: {
            x0: 0,
            x1: 0,
            x2: 0,
          },
        },
      })),
    }));

    render(<App />);

    fireEvent.click(screen.getByText('Optimize DEX'));

    await waitFor(() => {
      const alert = screen.getByText(/Optimization failed: No optimal DEX found/i);
      expect(alert).toBeInTheDocument();
    });
  });
});
