import { PublicKey, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";
import { SignedTransactionDetails } from "../models/SingedTransactionDetails";

export async function validateTransaction(
  signedDetails: SignedTransactionDetails
) {
  console.log("inside");
  const { clientSignature, clientPublicKey, transactionDetails } =
    signedDetails;

  const payload = JSON.stringify(transactionDetails);

  const publicKey = new PublicKey(clientPublicKey);

  // Decode the signature from base58
  const decodedClientSignature = bs58.decode(clientSignature);

  const isValidSignature = await verifySignature(
    payload,
    decodedClientSignature,
    publicKey
  );

  return isValidSignature;
}

async function verifySignature(payload: any, signature: any, publicKey: any) {
  return true;
}
