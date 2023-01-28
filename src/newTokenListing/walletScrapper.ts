import axios from "axios";
import cheerio from "cheerio";
import chalk from 'chalk';


const fethHtml = async (url:string) => {
  const { data } = await axios.get(url);
  return data;
};

const callSteam = async (address : string ,chain : string ) => {
  const Explorer = require("./constants/"+chain+"/blockExplorer.json");
  const steamUrl = Explorer["address"].replace("0x", address);
  
  // TODO fetch directly what we need
  const html = await fethHtml(steamUrl);
  const selector = cheerio.load(html);

  const searchResults = selector("body").find(
    "#ContentPlaceHolder1_trContract > div > div.col-md-8 > a"
  );
  
  return searchResults.html();
};

export const scrapSteam = async (address : string,chain : string): Promise<string | null> => {
  const Explorer = require("./constants/"+chain+"/blockExplorer.json");
  
  return new Promise((resolve, reject) => {

    const inter = setInterval(async () => {

      const creatorAddress = await callSteam(address,chain);
      console.log('creatorAddress', creatorAddress);
      
      if (creatorAddress !== null) 
      {  
        console.log(chalk.green(`creator address: ${Explorer["address"].replace("0x", creatorAddress)}`));
        clearInterval(inter);
        resolve(creatorAddress);
      }
    }, 500);
  });
};

export const AskWebPage = async (address : string,chain : string) => {
  const Explorer = require("./constants/"+chain+"/blockExplorer.json");
  const steamUrl = Explorer["txs"].replace("0x", address);
  const html = await fethHtml(steamUrl);
  
  const $ = cheerio.load(html);

  const AllTransactions : {[key: string]: string[]}= {
    "columnHeadings": [],
    "rows": [],
    "everything": [],
  };

  $("body")
    .find(
      `div[class="wrapper"]
      > main[id="content"]
      > div[class="container space-bottom-2"]
      > div[class="card"]
      > div[class="card-body"]
      > div[class="table-responsive mb-2 mb-md-0"]
      > table[class="table table-hover"]
      `
    )
    .each( (i: any, table: any) => {
      $(table)
        .find("th")
        .each( (j: any, elt: any) => {
          let header = "";
          for (var txt of $(elt).text().split(" ")) 
          {
            if (txt.length > 2 && txt !== "\n") 
            {
              while (txt.includes("\n")) {
                txt = txt.replace("\n", "");
              }
              header += " " + txt;
            }
          }

          AllTransactions["columnHeadings"].push(
            header.split("\n")[0].split(" ").splice(1).join(" ")
          );
        });

      AllTransactions["columnHeadings"] = AllTransactions[
        "columnHeadings"
      ].filter(function (value, index, arr) {
        return value.length > 2;
      });
      let array: string[]= [];
      $(table)
        .find("td")
        .each((index: any, elt: any) => {
          const text = $(elt).text();
          //console.log(text);
          if (text.length > 0) {
            array.push($(elt).text());
          } else {
            AllTransactions["rows"].push(array.toString());
            array = [];
          }
        });
    });

  AllTransactions["columnHeadings"].splice(3, 0, "Age1");
  AllTransactions["columnHeadings"].splice(4, 0, "Age2");
  AllTransactions["columnHeadings"].splice(6, 0, "Sens");
  AllTransactions["columnHeadings"].splice(7, 0, "To");

  for (let i = 0; i < AllTransactions["rows"].length; i++) 
  {
  
    if ( AllTransactions["rows"][i].length > 2)
    {
      const tx: any = {};
      const columns = AllTransactions["rows"][i].split(",")
      columns.forEach( (c, j) => tx[AllTransactions["columnHeadings"][j]] = c )
      
      AllTransactions["everything"].push(tx);
    }
  }

  return AllTransactions;
}
