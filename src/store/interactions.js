import { ethers } from 'ethers'
import { useSelector } from 'react-redux';
import {
  setProvider,
  setNetwork,
  setAccount
} from './reducers/provider'

import {
  setContracts,
  setSymbols,
  balancesLoaded
} from './reducers/tokens'

import {
  setContract,
  sharesLoaded,
  swapsLoaded,
  depositRequest,
  depositSuccess,
  depositFail,
  withdrawRequest,
  withdrawSuccess,
  withdrawFail,
  swapRequest,
  swapSuccess,
  swapFails
} from './reducers/amm'

import TOKEN_ABI from '../abis/Token.json';
import AMM_ABI from '../abis/AMM.json';
import config from '../config.json';

export const loadProvider = (dispatch) => {
  const provider = new ethers.providers.Web3Provider(window.ethereum)
  dispatch(setProvider(provider))

  return provider
}




export const loadNetwork = async (provider, dispatch) => {
  const network = await provider.getNetwork();
  const chainId = network.chainId;
  const networkName = network.name || 'Unknown'; // Domyślnie 'Unknown', jeśli brak nazwy

  dispatch(setNetwork(chainId)); // Ustawienie chainId w Redux
  return { chainId, networkName }; // Zwróć oba parametry
};


export const loadAccount = async (dispatch) => {
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
  const account = ethers.utils.getAddress(accounts[0])
  dispatch(setAccount(account))

  return account
}

// ------------------------------------------------------------------------------
// LOAD CONTRACTS
export const loadTokens = async (provider, dexAggregator, dispatch) => {
  try {
    // Pobierz listę tokenów z Dex Aggregatora
    const fetchedTokens = await dexAggregator.getTokens();

    console.log('Fetched tokens from Dex Aggregator:', fetchedTokens);

    // Przekształć listę na instancje kontraktów
    const tokens = fetchedTokens.map(token => {
      const contract = new ethers.Contract(token.tokenAddress, TOKEN_ABI, provider);
      return { ...token, contract };
    });

    // Pobierz symbole tokenów i zapisz w Redux
    const symbols = await Promise.all(tokens.map(token => token.contract.symbol()));
    const tokenContracts = tokens.map(token => token.contract);

    dispatch(setContracts(tokenContracts));
    dispatch(setSymbols(symbols));

    console.log('Tokens loaded successfully:', symbols);
    return tokens;
  } catch (error) {
    console.error('Error loading tokens:', error);
    throw error;
  }
};


export const loadAMM = async (provider, chainId, dispatch) => {
  const signer = provider.getSigner();
  // Uzyskaj tablicę adresów AMM z config.json
  const ammAddresses = config[chainId]?.amm?.addresses;

  // Sprawdź, czy tablica adresów AMM nie jest pusta
  if (!ammAddresses || ammAddresses.length === 0) {
    console.error(`No AMM addresses found for chainId ${chainId}`);
    return null; // Możesz również rzucić błąd lub zwrócić pustą wartość
  }

  // Logowanie adresów AMM
  console.log(`Fetched AMM addresses for chainId ${chainId}:`, ammAddresses);

  // Tworzenie instancji kontraktów AMM
  const amms = ammAddresses.map(address => {
    console.log(`Creating AMM contract instance for address: ${address}`);
    return new ethers.Contract(address, AMM_ABI, signer);
  });

  // Dispatch do ustawienia kontraktów AMM w Redux
  dispatch(setContract(amms));
  console.log("AMM contracts dispatched to Redux:", amms);

  return amms; // Zwróć wszystkie instancje AMM
};



// ------------------------------------------------------------------------------
// ------------------------------------------------------------------------------
// LOAD BALANCES & SHARES
export const loadBalances = async (provider, amm, tokens, account, dispatch) => {
  try {
    // Tworzenie instancji kontraktu AMM
    console.log("Creating AMM Contract instance...");
    const signer = provider.getSigner();
    const ammContract = new ethers.Contract(amm.ammAddress, AMM_ABI, signer);
    console.log("AMM Contract created at address:", amm.ammAddress);

    // Pobranie bilansu tokenów użytkownika
    console.log("Fetching token balances for account:", account);
    const balance1 = await tokens[0].balanceOf(account);
    const balance2 = await tokens[1].balanceOf(account);
    console.log("Token 1 Balance:", ethers.utils.formatUnits(balance1.toString(), 'ether'));
    console.log("Token 2 Balance:", ethers.utils.formatUnits(balance2.toString(), 'ether'));

    // Przekształcenie wartości na ether i wysłanie do redux
    dispatch(balancesLoaded([
      ethers.utils.formatUnits(balance1.toString(), 'ether'),
      ethers.utils.formatUnits(balance2.toString(), 'ether')
    ]));

    // Pobranie ilości udziałów użytkownika w AMM
    console.log("Fetching shares for account:", account);
    const shares = await ammContract.shares(account);
    console.log("Shares:", ethers.utils.formatUnits(shares.toString(), 'ether'));
    dispatch(sharesLoaded(ethers.utils.formatUnits(shares.toString(), 'ether')));
  } catch (error) {
    console.error("Error loading balances:", error);
  }
};




// ------------------------------------------------------------------------------
// ADD LIQUDITY
export const addLiquidity = async (provider, amm, tokens, amounts, dispatch) => {
  try {
    dispatch(depositRequest())

    const signer = await provider.getSigner()

    let transaction
    const ammContract = new ethers.Contract(amm.ammAddress, AMM_ABI, signer);

    transaction = await tokens[0].connect(signer).approve(ammContract.address, amounts[0])
    await transaction.wait()

    transaction = await tokens[1].connect(signer).approve(ammContract.address, amounts[1])
    await transaction.wait()

    transaction = await ammContract.connect(signer).addLiquidity(amounts[0], amounts[1])
    await transaction.wait()

    dispatch(depositSuccess(transaction.hash))
  } catch (error) {
    dispatch(depositFail())
  }
}

// ------------------------------------------------------------------------------
// REMOVE LIQUDITY
export const removeLiquidity = async (provider, amm, shares, dispatch) => {
  try {
    dispatch(withdrawRequest())

    const signer = provider.getSigner();

    // Tworzymy instancję kontraktu AMM z adresem i ABI
    const ammContract = new ethers.Contract(amm.ammAddress, AMM_ABI, signer);

    // Wywołujemy funkcję `removeLiquidity` na instancji kontraktu
    let transaction = await ammContract.removeLiquidity(shares);
    await transaction.wait();

    dispatch(withdrawSuccess(transaction.hash))
  } catch (error) {
    dispatch(withdrawFail())
  }
}

// ------------------------------------------------------------------------------
// SWAP


export const swap = async (provider, amm, token, symbol, amount, dispatch) => {
  try {
    dispatch(swapRequest());

    const signer = await provider.getSigner();
    const account = await signer.getAddress(); // Pobranie adresu konta użytkownika
    const scaledAmount = ethers.utils.parseUnits(amount.toString(), 18);

    // Tworzenie instancji kontraktu AMM
    console.log("Creating AMM Contract instance for swap...");
    const ammContract = new ethers.Contract(amm.ammAddress, AMM_ABI, signer);
    console.log("AMM Contract created at address:", amm.ammAddress);
    console.log("Creating AMM Contract instance for swap...");
    // Autoryzacja transferu tokenów dla AMM
    console.log("scaledAmount====",scaledAmount);
    const chainId = await loadNetwork(provider, dispatch);


    let transaction = await token.connect(signer).approve(amm.ammAddress, scaledAmount);
    await transaction.wait();
    console.log("Approve transaction confirmed:", transaction.hash);

    // Pobranie początkowego bilansu tokenów
    console.log("Fetching initial token balance for account:", account);
    const initialBalance = await token.balanceOf(account);
    console.log("Initial Token Balance:", ethers.utils.formatUnits(initialBalance, 18));

    // Wybierz funkcję swap w zależności od symbolu tokena
    if (symbol === "DAPP") {
      console.log("Calling swapToken1 function...");
      transaction = await ammContract.swapToken1(scaledAmount);
    } else {
      console.log("Calling swapToken2 function...");
      transaction = await ammContract.swapToken2(scaledAmount);
    }

    // Oczekiwanie na potwierdzenie transakcji swap
    await transaction.wait();
    console.log("Swap transaction confirmed:", transaction.hash);

    // Pobranie końcowego bilansu tokenów
    console.log("Fetching final token balance for account:", account);
    const finalBalance = await token.balanceOf(account);
    console.log("Final Token Balance:", ethers.utils.formatUnits(finalBalance, 18));

    // Obliczenie różnicy bilansu
    const balanceDifference = initialBalance.sub(finalBalance);
    console.log("Token Balance Difference:", ethers.utils.formatUnits(balanceDifference, 18));

    // Pobranie ilości udziałów użytkownika w AMM
    console.log("Fetching shares after swap for account:", account);
    const shares = await ammContract.shares(account);
    console.log("Shares after swap:", ethers.utils.formatUnits(shares.toString(), 'ether'));
    dispatch(sharesLoaded(ethers.utils.formatUnits(shares.toString(), 'ether')));

    // Wysyłanie informacji o sukcesie
    dispatch(swapSuccess(transaction.hash));

    // Zwracanie transakcji po zakończeniu sukcesem
    return transaction;
  } catch (error) {
    console.error("Error in swap:", error);
    return null; // Zwraca null w przypadku błędu
  }
};










// ------------------------------------------------------------------------------
// LOAD ALL SWAPS

export const loadAllSwaps = async (provider, amm, dispatch) => {
  const block = await provider.getBlockNumber()

  const swapStream = await amm.queryFilter('Swap', 0, block)
  const swaps = swapStream.map(event => {
    return { hash: event.transactionHash, args: event.args }
  })

  dispatch(swapsLoaded(swaps))
}
