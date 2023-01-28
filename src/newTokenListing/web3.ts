import Web3 from 'web3'


const Config : { [key: string]: { [key: string]: string } }= require("./constants/Config.json");

const clients : { [key: string]: Web3[] } = {};

for (const [key, value] of Object.entries(Config)) {
  clients[key] = []
  clients[key].push( new Web3(value["RPC"]));
}


const randomClient = (chain : string) =>
  clients[chain][~~(clients[chain].length * Math.random())]



const web3Factory = (chain : string) => {
  return randomClient(chain)
}
  
export default web3Factory