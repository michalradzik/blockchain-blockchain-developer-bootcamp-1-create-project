import { ethers } from 'ethers'

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
  const { chainId } = await provider.getNetwork()
  dispatch(setNetwork(chainId))

  return chainId
}

export const loadAccount = async (dispatch) => {
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
  const account = ethers.utils.getAddress(accounts[0])
  dispatch(setAccount(account))

  return account
}

// ------------------------------------------------------------------------------
// LOAD CONTRACTS
export const loadTokens = async (provider, chainId, dispatch) => {
  const dapp = new ethers.Contract(config[chainId].dapp.address, TOKEN_ABI, provider)
  const usd = new ethers.Contract(config[chainId].usd.address, TOKEN_ABI, provider)

  dispatch(setContracts([dapp, usd]))
  dispatch(setSymbols([await dapp.symbol(), await usd.symbol()]))
  return [dapp, usd];
}



export const loadAMM = async (provider, chainId, dispatch) => {
  // Uzyskaj tablicę adresów AMM z config.json
  const ammAddresses = config[chainId].amm.addresses;

  // Sprawdź, czy tablica adresów AMM nie jest pusta
  if (!ammAddresses || ammAddresses.length === 0) {
    console.error(`No AMM addresses found for chainId ${chainId}`);
    return null; // Możesz również rzucić błąd lub zwrócić pustą wartość
  }

  // Tworzenie instancji kontraktów AMM
  const amms = ammAddresses.map(address => new ethers.Contract(address, AMM_ABI, provider));

  // Dispatch do ustawienia kontraktów AMM w Redux
  dispatch(setContract(amms));

  return amms; // Zwróć wszystkie instancje AMM
};


// ------------------------------------------------------------------------------
export const loadBalances = async (amms, tokens, account, dispatch, provider) => {

  if (!provider) {
    provider = loadProvider(dispatch);
  }
  // Pobieranie i formatowanie sald dla dwóch tokenów
  const balance1 = await tokens[0].balanceOf(account);
  const balance2 = await tokens[1].balanceOf(account);

  dispatch(balancesLoaded([
    ethers.utils.formatUnits(balance1.toString(), 'ether'),
    ethers.utils.formatUnits(balance2.toString(), 'ether')
  ]));

  // Pobieranie udziałów dla każdego AMM
  const sharesPromises = amms.map(async (amm) => {
    if (!amm.address) {
      console.error("Invalid AMM address:", amm);
      return "0"; // Zwracamy "0" jako domyślną wartość udziałów dla nieprawidłowego adresu
    }
    const ammContract = new ethers.Contract(amm.address, AMM_ABI, provider);  // Używamy `amm.ammAddress` zamiast `amm`
    const shares = await ammContract.shares(account);  // Wywołujemy funkcję `shares` na instancji kontraktu
    return ethers.utils.formatUnits(shares.toString(), 'ether');
  });

  // Oczekiwanie na wszystkie udziały z każdego AMM
  const shares = await Promise.all(sharesPromises);

  // Aktualizacja stanu aplikacji, zapisując udziały dla wszystkich AMM
  dispatch(sharesLoaded(shares));  // Przekazujemy tablicę z udziałami dla każdego AMM
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
    const scaledAmount = ethers.utils.parseUnits(amount.toString(), 18);

    // Tworzenie instancji kontraktu AMM
    const ammContract = new ethers.Contract(amm.ammAddress, AMM_ABI, signer);
    console.log("AMM Contract instance created:", ammContract);

    // Autoryzacja transferu tokenów dla AMM
    let transaction = await token.connect(signer).approve(amm.ammAddress, scaledAmount);
    await transaction.wait();
    console.log("Approve transaction confirmed:", transaction.hash);

    // Nasłuchuj na zdarzenie Swap
    ammContract.once("Swap", (user, tokenGive, tokenGiveAmount, tokenGet, tokenGetAmount, token1Balance, token2Balance, timestamp) => {
      console.log("Swap Event Detected:");
      console.log("  User:", user);
      console.log("  Token Given:", tokenGive);
      console.log("  Amount Given:", ethers.utils.formatUnits(tokenGiveAmount, 18));
      console.log("  Token Received:", tokenGet);
      console.log("  Amount Received:", ethers.utils.formatUnits(tokenGetAmount, 18));
      console.log("  Token1 Balance:", ethers.utils.formatUnits(token1Balance, 18));
      console.log("  Token2 Balance:", ethers.utils.formatUnits(token2Balance, 18));
      console.log("  Timestamp:", new Date(timestamp * 1000).toLocaleString());
    });

    // Wybierz funkcję swap w zależności od symbolu tokena
    if (symbol === "DAPP") {
      transaction = await ammContract.swapToken1(scaledAmount);
    } else {
      transaction =await ammContract.swapToken2(scaledAmount);
    }

    await transaction.wait();
    console.log("Swap transaction confirmed:", transaction.hash);

    dispatch(swapSuccess(transaction.hash));

  } catch (error) {
    console.error("Error in swap:", error);

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
