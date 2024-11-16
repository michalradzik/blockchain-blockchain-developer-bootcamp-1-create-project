import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Spinner from 'react-bootstrap/Spinner';
import { ethers } from 'ethers';
import AMM_ABI from '../abis/AMM.json';
import Alert from './Alert';
import {
  addLiquidity,
  loadBalances
} from '../store/interactions';

const Deposit = ({ amm, amms }) => {
  const [token1Amount, setToken1Amount] = useState(0);
  const [token2Amount, setToken2Amount] = useState(0);
  const [showAlert, setShowAlert] = useState(false);
  
  const provider = useSelector(state => state.provider.connection);
  const account = useSelector(state => state.provider.account);
  
  const tokens = useSelector(state => state.tokens.contracts);
  const symbols = useSelector(state => state.tokens.symbols);
  const balances = useSelector(state => state.tokens.balances);
  
 //const amm = useSelector(state => state.amm.contract);
  const isDepositing = useSelector(state => state.amm.depositing.isDepositing);
  const isSuccess = useSelector(state => state.amm.depositing.isSuccess);
  const transactionHash = useSelector(state => state.amm.depositing.transactionHash);
  console.log("AMM Deposit Contract:", amm);
  console.log("AMMssss Deposit Contract::", amms);
  // Logowanie stanu
  //console.log("Token 1 Amount:", token1Amount);
  //console.log("Token 2 Amount:", token2Amount);
  //console.log("Provider:", provider);
  //console.log("Account:", account);
  //console.log("Tokens:", tokens);
  //console.log("Symbols:", symbols);
  //console.log("Balances:", balances);
  //console.log("AMM Contract:", amm);
  //console.log("Is Depositing:", isDepositing);
  //console.log("Is Success:", isSuccess);
  //console.log("Transaction Hash:", transactionHash);
  
  const dispatch = useDispatch();

  //console.log("AMMs Contract:", amms);
  const amountHandler = async (e) => {
    const ammContract = new ethers.Contract(amm.ammAddress, AMM_ABI, provider);
    if (e.target.id === 'token1') {
      setToken1Amount(e.target.value);
      // Fetch value from chain
      const _token1Amount = ethers.utils.parseUnits(e.target.value, 'ether');
      const result = await ammContract.calculateToken2Deposit(_token1Amount);
      const _token2Amount = ethers.utils.formatUnits(result.toString(), 'ether');

      setToken2Amount(_token2Amount);
    } else {
      setToken2Amount(e.target.value);

      // Fetch value from chain
      const _token2Amount = ethers.utils.parseUnits(e.target.value, 'ether');
      const result = await ammContract.calculateToken1Deposit(_token2Amount);
      const _token1Amount = ethers.utils.formatUnits(result.toString(), 'ether');

      setToken1Amount(_token1Amount);
    }
  };

  const depositHandler = async (e) => {
    e.preventDefault();

    setShowAlert(false);

    const _token1Amount = ethers.utils.parseUnits(token1Amount, 'ether');
    const _token2Amount = ethers.utils.parseUnits(token2Amount, 'ether');

    await addLiquidity(
      provider,
      amm,
      tokens,
      [_token1Amount, _token2Amount],
      dispatch
    );

    await loadBalances(amms, tokens, account, dispatch);

    setShowAlert(true);
  };

  return (
    <div>
      <Card style={{ maxWidth: '450px' }} className='mx-auto px-4'>
        {account ? (
          <Form onSubmit={depositHandler} style={{ maxWidth: '450px', margin: '50px auto' }}>
            <Row>
              <Form.Text className='text-end my-2' muted>
                Balance: {balances[0]}
              </Form.Text>
              <InputGroup>
                <Form.Control
                  type="number"
                  placeholder="0.0"
                  min="0.0"
                  step="any"
                  id="token1"
                  onChange={(e) => amountHandler(e)}
                  value={token1Amount === 0 ? "" : token1Amount}
                />
                <InputGroup.Text style={{ width: "100px" }} className="justify-content-center">
                  {symbols && symbols[0]}
                </InputGroup.Text>
              </InputGroup>
            </Row>

            <Row className='my-3'>
              <Form.Text className='text-end my-2' muted>
                Balance:  {balances[1]}
              </Form.Text>
              <InputGroup>
                <Form.Control
                  type="number"
                  placeholder="0.0"
                  step="any"
                  id="token2"
                  onChange={(e) => amountHandler(e)}
                  value={token2Amount === 0 ? "" : token2Amount}
                />
                <InputGroup.Text style={{ width: "100px" }} className="justify-content-center">
                  {symbols && symbols[1]}
                </InputGroup.Text>
              </InputGroup>
            </Row>

            <Row className='my-3'>
              {isDepositing ? (
                <Spinner animation="border" style={{ display: 'block', margin: '0 auto' }} />
              ) : (
                <Button type="submit">Deposit</Button>
              )}
            </Row>
          </Form>
        ) : (
          <p
            className='d-flex justify-content-center align-items-center'
            style={{ height: '300px' }}
          >
            Please connect wallet.
          </p>
        )}
      </Card>

      {isDepositing ? (
        <Alert
          message={'Deposit Pending...'}
          transactionHash={null}
          variant={'info'}
          setShowAlert={setShowAlert}
        />
      ) : isSuccess && showAlert ? (
        <Alert
          message={'Deposit Successful'}
          transactionHash={transactionHash}
          variant={'success'}
          setShowAlert={setShowAlert}
        />
      ) : !isSuccess && showAlert ? (
        <Alert
          message={'Deposit Failed'}
          transactionHash={null}
          variant={'danger'}
          setShowAlert={setShowAlert}
        />
      ) : (
        <></>
      )}
    </div>
  );
};

export default Deposit;
