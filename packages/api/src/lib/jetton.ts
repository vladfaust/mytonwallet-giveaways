import { sha256_sync } from "@ton/crypto";
import { Address, BitString, Cell, Dictionary, Slice } from "ton";

const ONCHAIN_CONTENT_PREFIX = 0x00;
const OFFCHAIN_CONTENT_PREFIX = 0x01;
const SNAKE_PREFIX = 0x00;

type MetadataKey =
  | "name"
  | "description"
  | "image"
  | "symbol"
  | "image_data"
  | "decimals";

const OnChainMetadataSpec: {
  [key in MetadataKey]: BufferEncoding | undefined;
} = {
  name: "utf8",
  description: "utf8",
  image: "ascii",
  decimals: "utf8",
  symbol: "utf8",
  image_data: undefined,
};

// Map a sha256 hash of a metadata key to the key string, i.e. { [sha256(key)]: key }.
const MetadataHashMap = new Map<string, MetadataKey>(
  Object.entries(OnChainMetadataSpec).map(([key]) => [
    sha256_sync(Buffer.from(key)).toString("hex"),
    key as MetadataKey,
  ]),
);

type PersistenceType = "onchain" | "offchain_private_domain" | "offchain_ipfs";

/**
 * @see https://github.com/ton-blockchain/minter/blob/c877b79ebb832472b05801dce5d91507349c6134/src/lib/jetton-minter.ts
 * (Adapted the code to work with "`ton"` and `"@ton/crypto"` packages).
 */
export async function readJettonMetadata(contentCell: Cell): Promise<{
  persistenceType: PersistenceType;
  metadata: { [s in MetadataKey]?: string };
}> {
  const contentSlice = contentCell.beginParse();

  switch (contentSlice.loadUint(8)) {
    case ONCHAIN_CONTENT_PREFIX:
      return {
        persistenceType: "onchain",
        ...parseJettonOnchainMetadata(contentSlice),
      };

    case OFFCHAIN_CONTENT_PREFIX:
      const { metadata, isIpfs } =
        await parseJettonOffchainMetadata(contentSlice);

      return {
        persistenceType: isIpfs ? "offchain_ipfs" : "offchain_private_domain",
        metadata,
      };

    default:
      throw new Error("Unexpected Jetton metadata content prefix");
  }
}

async function parseJettonOffchainMetadata(contentSlice: Slice): Promise<{
  metadata: { [s in MetadataKey]?: string };
  isIpfs: boolean;
}> {
  const jsonURI = contentSlice
    .loadBuffer(contentSlice.remainingBits / 8)
    .toString("ascii")
    .replace("ipfs://", "https://ipfs.io/ipfs/");

  return {
    metadata: await fetch(jsonURI).then((r) => r.json()),
    isIpfs: /(^|\/)ipfs[.:]/.test(jsonURI),
  };
}

function parseJettonOnchainMetadata(contentSlice: Slice): {
  metadata: { [s in MetadataKey]?: string };
} {
  const dict = contentSlice.loadDict(
    Dictionary.Keys.Buffer(32), // > Key is sha256 hash of string.
    Dictionary.Values.Cell(),
  );

  const metadataMap: Map<MetadataKey, Buffer> = new Map();

  for (const rawKey of dict.keys()) {
    const key = MetadataHashMap.get(rawKey.toString("hex"));
    if (!key) {
      throw new Error(
        `Unexpected Jetton metadata dictionary key: ${rawKey.toString("hex")}`,
      );
    }

    const slice = dict.get(rawKey)!.asSlice();

    let value;
    if (slice.remainingRefs === 0) {
      value = readMetadataValue(slice.asCell(), Buffer.from(""), true);
    } else {
      value = readMetadataValue(slice.loadRef(), Buffer.from(""), true);
    }

    metadataMap.set(key, value);
  }

  return {
    metadata: Object.fromEntries(
      Array.from(metadataMap.entries()).map(([key, value]) => [
        key,
        value.toString(OnChainMetadataSpec[key]),
      ]),
    ),
  };
}

/**
 * @see https://github.com/ton-blockchain/TEPs/blob/master/text/0064-token-data-standard.md#data-serialization
 */
function readMetadataValue(
  cell: Cell,
  value: Buffer,
  isFirst: boolean,
): Buffer {
  const parser = cell.beginParse();

  if (isFirst && parser.loadUint(8) !== SNAKE_PREFIX) {
    throw new Error("Only snake format is supported");
  }

  value = Buffer.concat([value, parser.loadBuffer(parser.remainingBits / 8)]);

  if (parser.remainingRefs === 1) {
    value = readMetadataValue(parser.loadRef(), value, false);
  }

  return value;
}

/**
 * Create a jetton transfer body cell.
 *
 * @see https://github.com/toncenter/tonweb/blob/76dfd0701714c0a316aee503c2962840acaf74ef/src/contract/token/ft/JettonWallet.js#L22
 * (Adapted the code to work with `"ton"` and `"@ton/crypto"` packages).
 */
export function createTransferBody(params: {
  queryId?: number;
  jettonAmount: bigint;
  toAddress: Address;
  responseAddress: Address;
  forwardAmount?: bigint;
  forwardPayload?: Uint8Array | Cell;
}): Cell {
  const cell = new Cell().asBuilder();

  cell.storeUint(0xf8a7ea5, 32); // request_transfer op
  cell.storeUint(params.queryId || 0, 64);
  cell.storeCoins(params.jettonAmount);
  cell.storeAddress(params.toAddress);
  cell.storeAddress(params.responseAddress);
  cell.storeBit(false); // null custom_payload
  cell.storeCoins(params.forwardAmount || BigInt(0));

  if (params.forwardPayload) {
    if (params.forwardPayload instanceof Cell) {
      cell.storeBit(true); // true Either - write forward_payload in separate cell
      cell.storeRef(params.forwardPayload);
    } else {
      cell.storeBit(false); // false Either - write forward_payload in current slice
      cell.storeBits(
        new BitString(
          Buffer.from(params.forwardPayload),
          0,
          params.forwardPayload.length,
        ),
      );
      // todo: support write snake bytes
    }
  } else {
    cell.storeBit(false); // false Either for empty payload
  }

  cell.endCell();
  return cell.asCell();
}
