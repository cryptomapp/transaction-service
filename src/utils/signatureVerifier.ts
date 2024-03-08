import { PublicKey } from "@solana/web3.js";
import { SignedTransactionDetails } from "../models/SingedTransactionDetails";
import bs58 from "bs58";
import nacl from "tweetnacl";

export const verifyClientSignature = async (
  signedDetails: SignedTransactionDetails
): Promise<boolean> => {
  // Decode the client's public key and signature from Base58
  const publicKeyBytes = bs58.decode(signedDetails.clientPublicKey);
  const signatureBytes = bs58.decode(signedDetails.clientSignature);

  // Convert the transaction details into a message buffer
  // This is what the client should have signed
  const message = new TextEncoder().encode(
    JSON.stringify(signedDetails.transactionDetails)
  );

  // Verify the signature using tweetnacl
  // nacl.sign.detached.verify returns true if the signature is valid
  return nacl.sign.detached.verify(message, signatureBytes, publicKeyBytes);
};
