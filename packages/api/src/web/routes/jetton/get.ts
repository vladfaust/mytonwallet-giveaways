import cors from "cors";
import { Router } from "express";
import { JettonMaster, fromNano } from "ton";
import { readJettonMetadata } from "../../../lib/jetton.js";
import { client, testOnly, tryParseAddress } from "../../../lib/ton.js";

// NOTE: I'm opted out of using "tonweb" package, which is recommended
// by docs[^1], on clients, because it's too heavy:
//
// > added 1023 packages, changed 1 package, and audited 1492 packages in 4m
//
// [1]: https://docs.ton.org/develop/dapps/asset-processing/jettons#retrieving-jetton-data
export default Router()
  .use(cors())
  .get("/jetton/:contractAddress", async (req, res) => {
    const contractAddress = tryParseAddress(req.params.contractAddress);

    if (!contractAddress) {
      return res.status(400).send("Invalid contract address");
    }

    const jettonMaster = JettonMaster.create(contractAddress);

    try {
      const data = await client.open(jettonMaster).getJettonData();
      const metadata = await readJettonMetadata(data.content);

      return res.json({
        totalSupply: fromNano(data.totalSupply),
        mintable: data.mintable,
        adminAddress: data.adminAddress.toString({
          testOnly,
          bounceable: true,
          urlSafe: true,
        }),
        metadata,
      });
    } catch (e) {
      console.error(e);
      return res.status(400).send(`Failed to read Jetton metadata`);
    }
  });
