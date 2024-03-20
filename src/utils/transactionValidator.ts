import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { SignedTransactionDetails } from "../models/SingedTransactionDetails";

// TODO: not sure if it really works xD

// Function to verify the signature
export async function validateTransaction(
  signedDetails: SignedTransactionDetails
): Promise<boolean> {
  const { message, signature, clientPublicKey } = signedDetails;

  // Decode the message and signature from base58
  const decodedMessage = bs58.decode(message);
  const decodedSignature = bs58.decode(signature);

  // Convert the client's public key from base58 and create a PublicKey object
  const publicKeyBytes = bs58.decode(clientPublicKey);
  const publicKey = new PublicKey(publicKeyBytes).toBytes();

  // Verify the signature
  const isVerified = nacl.sign.detached.verify(
    decodedMessage,
    decodedSignature,
    publicKey
  );

  return isVerified;
}
