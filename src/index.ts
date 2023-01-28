
import run from "./newTokenListing/ListingTokenMain"
import io from './server'

[
    "AVAX",
    "FTM",
    "ETH",
    "ARBITRUM",
    "MATIC"
].forEach( bc => run(bc, io) )
