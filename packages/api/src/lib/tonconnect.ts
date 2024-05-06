// @author https://gist.github.com/TrueCarry/cac00bfae051f7028085aa018c2a05c6
//

import { createHash } from "crypto";
import nacl from "tweetnacl";

interface domain {
  lengthBytes: number;
  value: string;
}

interface Message {
  workchain: number;
  address: Buffer;
  timestamp: number;
  domain: domain;
  payload: string;
}

/**
 * Verifies the signature of a message.
 */
export async function verifySignature(
  pubkey: Buffer,
  message: Message,
  signature: Buffer,
): Promise<boolean> {
  return nacl.sign.detached.verify(
    await createMessage(message),
    signature,
    pubkey,
  );
}

const TON_PROOF_PREFIX = "ton-proof-item-v2/";
const TON_CONNECT_PREFIX = "ton-connect";

async function createMessage(message: Message): Promise<Buffer> {
  const wc = Buffer.alloc(4);
  wc.writeUint32BE(message.workchain);

  const ts = Buffer.alloc(8);
  ts.writeBigUint64LE(BigInt(message.timestamp));

  const dl = Buffer.alloc(4);
  dl.writeUint32LE(message.domain.lengthBytes);

  const m = Buffer.concat([
    Buffer.from(TON_PROOF_PREFIX),
    wc,
    message.address,
    dl,
    Buffer.from(message.domain.value),
    ts,
    Buffer.from(message.payload),
  ]);

  const messageHash = createHash("sha256").update(m).digest();

  const fullMes = Buffer.concat([
    Buffer.from([0xff, 0xff]),
    Buffer.from(TON_CONNECT_PREFIX),
    Buffer.from(messageHash),
  ]);

  const res = createHash("sha256").update(fullMes).digest();
  return Buffer.from(res);
}
