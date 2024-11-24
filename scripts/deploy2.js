const hre = require("hardhat");

async function main() {

  const Token = await ethers.getContractFactory('Token');

  // Deploy Token 1 (DAPP)
  let dapp = await Token.deploy('Dapp Token', 'DAPP', '1000000'); // 1 milion tokenów
  await dapp.waitForDeployment(); // Użyj deployed() zamiast waitForDeployment()
  console.log(`Dapp Token deployed to: ${dapp.target}\n`); // Używaj dapp.address

  // Deploy Token 2 (USD)
  const usd = await Token.deploy('USD Token', 'USD', '1000000'); // 1 milion tokenów
  await usd.waitForDeployment(); // Użyj deployed()
  console.log(`USD Token deployed to: ${usd.target}\n`); // Używaj usd.address

  // Deploy AMM kontrakt
  const AMM = await ethers.getContractFactory('AMM');
  const amm = await AMM.deploy(dapp.target, usd.target);
  await amm.waitForDeployment(); // Użyj deployed()
  console.log(`AMM contract deployed to: ${amm.target}\n`); // Używaj amm.address
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
