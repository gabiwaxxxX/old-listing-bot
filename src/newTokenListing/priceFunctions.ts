
//import Web3 from "web3";
import web3Factory from "./web3"
import {Contract} from 'web3-eth-contract';
import {BN_18} from './constants/numbers'
const BN = require("bn.js")
//const {BN_18}  =require("./constants/numbers")



const Config : { [key: string]: { [key: string]: string } }= require("./constants/Config.json");
const ERC20ContractABI = require("./constants/AVAX/erc20-ABI.json")



async function getPairAddress(othertoken : string, tokenAddress : string, factory : Contract ) {
    return tokenAddress
      ? tokenAddress > othertoken
        ? await factory.methods
            .getPair(tokenAddress, othertoken)
            .call()
        : await factory.methods
            .getPair(othertoken, tokenAddress)
            .call()
      : undefined;
  }
  
async function getDecimals(tokenAddress : string,chain : string) {
    const decimals = await getContract(tokenAddress,chain)
      .methods.decimals()
      .call();
    return decimals;
  }
  
function getContract(tokenAddress: string,chain : string) {
  
    const tokenContract = getContractAsERC20(tokenAddress,chain);
    
    
    return tokenContract;
  }
  
function getRouterContract(chain : string, dex : string) {
  const routerContract = getRouterAsRouter(chain,dex);
  
    
  return routerContract;
}

function getRouterAsRouter(chain : string, dex : string){

  const web3 = web3Factory(chain);
  const Dex = require("./constants/"+chain+"/dex.json");
  let RouterAddress;
  for(const element of Dex["DEX"]){
    if(element["name"]===dex){
      RouterAddress = element["router"]
    }
  }
  const ABI = require("./constants/"+chain+"/dexABI/"+dex+'.router.json')

  return new web3.eth.Contract(ABI, RouterAddress);
}
function getContractAsERC20(tokenAddress : string,chain : string) {

  const web3 = web3Factory(chain);
    // @ts-ignore: Object is possibly 'null'.
    return new web3.eth.Contract(ERC20ContractABI, tokenAddress);
  }

function generateWeb3(chain : string){
 return web3Factory(chain);
}
async function getReserves(token0Address :string, token1Address:string, pairAddress:string,chain :string) {
    
    const results = await Promise.all([
      getDecimals(token0Address,chain),
      getDecimals(token1Address,chain),
      getContract(token0Address,chain).methods.balanceOf(pairAddress).call(),
      getContract(token1Address,chain).methods.balanceOf(pairAddress).call(),
    ]);
    
    
    const reserveToken0 = new BN(results[2]).mul(
      get10PowN(BN_18.sub(new BN(results[0])))
    );
    const reserveToken1 = new BN(results[3]).mul(
      get10PowN(BN_18.sub(new BN(results[1])))
    );
  
    return { reserveToken0, reserveToken1 };
  }


function get10PowN(n :any) {
  return new BN("10").pow(new BN(n.toString()));
}

async function gettingPrice( chain : string, dex : string,token : string) {
  //const web3 = generateWeb3(chain)

  const stableCoin = require("./constants/stableCoin.json")
  if (token === stableCoin[chain])
    return 1

  const path = [stableCoin[chain], token]
  const resultsDecimal = await Promise.all([
      getDecimals(token,chain),
      getDecimals(stableCoin[chain],chain),
    ]);

  const amountIn = Math.pow(10,parseInt(resultsDecimal[1])).toString();
  
  const resultsRouterContract = await Promise.all([
      getRouterContract(chain,dex).methods.getAmountsOut(amountIn,path).call(),
    ]);

  return Math.pow(10,parseInt(resultsDecimal[0]))/resultsRouterContract[0][1]
}

export { getPairAddress,getDecimals,getContract,getContractAsERC20,getReserves,get10PowN,gettingPrice }


