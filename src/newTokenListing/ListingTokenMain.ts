import dotenv from "dotenv";
import Web3 from "web3";
import chalk from "chalk";
import fs from "fs";
import BN from 'bn.js';
import web3Factory from "./web3"
import log from '../logger'

import { AskWebPage, scrapSteam } from './walletScrapper'
import { Contract } from 'web3-eth-contract';
import { getDecimals, gettingPrice } from './priceFunctions'
import { getKeyByValue } from './utils'
import { BlockchainData } from "./models";
import { notify } from "../server";

const ENABLE_AUDIO = false;
const player = require("play-sound")()

dotenv.config();




const init = (chain: string): BlockchainData => {

	const dexes = require("./constants/" + chain + "/dex.json");
	const explorer = require("./constants/" + chain + "/blockExplorer.json");
	const chart = require("./constants/" + chain + "/dexScreener.json");
	const ABI20 = require("./constants/" + chain + "/erc20-ABI.json");

	const setOfTokensWithSymbol: { [key: string]: string } = {};
	const setOfTokens: string[] = [];
	const AMMs: { [key: string]: string } = {};

	const web3 = web3Factory(chain);

	const setOfRouter: { [key: string]: Contract }[] = [];
	const setOfFactory: { [key: string]: Contract }[] = [];

	const TokenFolder = fs.readdirSync(__dirname + "/constants/" + chain + "/token.list");
	TokenFolder.forEach( file => {

		const tokenList = require(__dirname + "/constants/" + chain + "/token.list/" + file);

		for (const element of tokenList["tokens"]) 
		{
			if (!(element["symbol"] in setOfTokensWithSymbol)) 
			{
				setOfTokensWithSymbol[element["symbol"]] = element["address"];
				setOfTokens.push(element["address"]);
			}
		}
	} )

	for (const element of dexes["DEX"]) 
	{
		const FactoryContractABI = require("./constants/" + chain + "/dexABI/" + element["name"] + ".factory.json");
		const factoryContract: { [key: string]: Contract } = {};

		// @ts-ignore: Object is possibly 'null'.
		factoryContract[element["name"]] = new web3.eth.Contract(
			FactoryContractABI,
			element["factory"]
		);
		setOfFactory.push(factoryContract);
		AMMs[element["name"]] = element["AMM"];
	}

	return {
		chain,
		explorer,
		chart,
		ABI20,
		setOfTokens,
		setOfTokensWithSymbol,
		setOfFactory,
		web3,
		AMMs,
	}
}

const onPairCreated = async ( bcData: BlockchainData, dex: string, token0: string, token1: string, pairAddress: string) => {

	const today = new Date();
	const time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();

	const msg = `
	\t New pair detected 
	\t  ${dex} - ${bcData.chain}
	\t =================
	\t token0: ${token0}
	\t token1: ${token1}`
	console.log(time, msg);

	const include0 = bcData.setOfTokens.includes(token0);
	const include1 = bcData.setOfTokens.includes(token1);

	console.log(include0, include1);
	

	if (include0 && include1) return; // no new token
	else if (!include0 && !include1) return // token not found

	const oldToken = include0 ? token0 : token1; // 0
	const newToken = include0 ? token1 : token0; // 1

	console.log("FOUND : ", getKeyByValue(bcData.setOfTokensWithSymbol, oldToken));

	
	const contractTokenBuy = new bcData.web3.eth.Contract(bcData.ABI20, newToken);

	const name = await contractTokenBuy.methods.name().call();
	const symbol = await contractTokenBuy.methods.symbol().call();
	const decimals = await contractTokenBuy.methods.decimals().call();

	const totalSupplyT = await contractTokenBuy.methods.totalSupply().call();
	const wei = Web3.utils.toWei(totalSupplyT, `wei`);
	const totalSupply: number = parseFloat(wei as any) / Math.pow(10, decimals);
	const explorerToken = bcData.explorer["token"].replace("0x", newToken)

	const details = `
	\t name is ==> ${name}
	\t symbol is ==> ${symbol}
	\t totalSupply is ==> ${totalSupply}
	\t ${chalk.green(explorerToken)}\n`

	log(details);

	/* WEBSOCKETS */
	const pairInfos = {
		dex, chain: bcData.chain, newToken, oldToken, name, symbol, totalSupply, explorerToken
	}
	notify('newPair', pairInfos);

	const creatorAdress = await scrapSteam(newToken, bcData.chain);
	if ( creatorAdress === null ) return;
	const transactions = await AskWebPage(creatorAdress, bcData.chain);

	const Method: any = [];
	const To: any = [];
	const singleMethod: any = {};
	const singleTo: any = {};

	transactions["everything"].forEach( (tx: any) => {
		Method.push(tx["Method"]);
		To.push(tx["To"]);

		if (!(tx["Method"] in singleMethod)) {
			singleMethod[tx["Method"]] = 1;
		} else {
			singleMethod[tx["Method"]] += 1;
		}
		if (!(tx["To"] in singleTo)) {
			singleTo[tx["To"]] = 1;
		} else {
			singleTo[tx["To"]] += 1;
		}
	})

	console.log("alltransactions", transactions["everything"]);
	console.log(singleMethod);
	console.log("singleTo", singleTo);
	
	// notify('pairMethod', singleMethod)

	// sale de faire in ...
	if (" Contract Creation" in singleTo) {
		console.log("Contract Creation => ", singleTo[" Contract Creation"]);
	}
	//|| !("Remove Liquidity" in Method)
	if (
		"Remove Liquidity..." in singleMethod ||
		"Remove Liquidity" in singleMethod
	) {
		return;
	} else {

		if (ENABLE_AUDIO)
			player.play(bcData.chain + ".mp3");
	}

	let out = "";
	for (const char of symbol) {
		const code = char.codePointAt(0);
		if (code >= 0x80) {
			out += `&#${code};`;
		} else {
			out += char;
		}
	}

	console.log(symbol, out);
	

	if (out.includes("&#")) {
		console.log(" run again...");
		return;
	} else {
		console.log("\nstarting checkLiq", pairAddress);
		await checkLiq(bcData, dex, pairAddress, name, newToken, oldToken);
	}
}

/**
 * TODO:
 *  regroup the logs into one variable that can also be passed to a websocket msg
 */
const run = async (chain: string, io: any) => {
	const bcData: BlockchainData = init(chain)
	const factories = bcData.setOfFactory;

	log(`Starting the trading bot on ${chain}: `, factories.map( f => Object.keys(f)[0] ))

	for (const elem in factories) 
	{
		for (const [dex, value] of Object.entries(factories[elem])) 
		{
			value.events.PairCreated(async (error: Error, event: any) => {

				if ( event.returnValues === undefined ) return;
				
				const { token0, token1, pair } = event.returnValues;

				await onPairCreated( bcData, dex, token0, token1, pair )
			} )
		}
	}
}

const LiqChecker = async (
	token: string,
	pairAddress: string,
	ABI20: any,
	web3: Web3,
	chain: string) => {

	const contractToken = new web3.eth.Contract(ABI20, token);

	const pairToken = await contractToken.methods.balanceOf(pairAddress).call();
	const pairTokenBN = new BN(pairToken);

	const decimalsb = await getDecimals(token, chain);
	const wei = Web3.utils.toWei(pairTokenBN.toString(), `wei`);
	
	return parseFloat(wei) / Math.pow(10, parseInt(decimalsb[0]));
};


const checkLiq = async (
	bcData: BlockchainData,
	dex: string,
	pairAddress: string,
	newTokenName: string,
	newToken: string, oldToken: string ) => {

	const chain = bcData.chain;

	const oldTokenAmount = await LiqChecker(oldToken, pairAddress, bcData.ABI20, bcData.web3, chain);
	const newTokenAmount = await LiqChecker(newToken, pairAddress, bcData.ABI20, bcData.web3, chain);

	const priceToken0 = await gettingPrice(chain, dex, oldToken)
	const oldTokenPrice = Math.floor(oldTokenAmount * priceToken0)
	const newTokenPrice = newTokenAmount === 0 ? 0 : priceToken0 / newTokenAmount

	const exchange = bcData.AMMs[dex]
		.replace("0xinput", oldToken)
		.replace("0xoutput", newToken);
	const chart = bcData.chart[chain].replace("0xpair", pairAddress);

	const oldTokenName = getKeyByValue(bcData.setOfTokensWithSymbol, oldToken)
	const tokenMsg = `
	Amount of ${oldTokenName} : ${oldTokenAmount} (${oldTokenPrice} $)
	Amount of ${newTokenName} : ${newTokenAmount} (${newTokenPrice} $)
	================================================
	${chalk.blue(exchange)}
	${chalk.red(chart)}
	================================================
	`

	console.log(dex, tokenMsg);

	const amountObject = { name: newTokenName, oldTokenName, oldTokenAmount, newTokenAmount, oldTokenPrice, newTokenPrice, exchange, chart }
	notify('pairAmounts', amountObject);
};

export default run;

