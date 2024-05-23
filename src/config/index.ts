import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import dotenv from "dotenv";
dotenv.config();

function createBase58Keypair(
  secretArrayStr: string | undefined
): string | undefined {
  if (!secretArrayStr) return undefined;
  const secretArray = JSON.parse(secretArrayStr);
  const secretUint8Array = Uint8Array.from(secretArray);
  const keypair = Keypair.fromSecretKey(secretUint8Array);
  return bs58.encode(keypair.secretKey);
}

export const config = {
  cryptoMappProgramId:
    process.env.PROGRAM_ADDRESS ||
    "8mDhNcko1rByfWLzVTuddx386JFwFnD3oDPWV2pzBckN",
  solanaProviderUrl: process.env.SOLANA_RPC || "https://api.devnet.solana.com",
  solPrivateKey: createBase58Keypair(process.env.SERVICE_WALLET_SECRET_KEY),

  port: process.env.PORT || 8080,
  timeout: 60000, // 60s
};
