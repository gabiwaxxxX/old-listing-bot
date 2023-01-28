
import Web3 from "web3";
import { Contract } from 'web3-eth-contract';

export interface BlockchainData {
    chain: string;
	explorer: any;
	chart: any;
	ABI20: any;
	setOfTokens: string[];
	setOfTokensWithSymbol: { [key: string]: string };
	setOfFactory: { [key: string]: Contract }[];
	web3: Web3;
	AMMs: { [key: string]: string };
}