import {
  Connection,
  Keypair,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";
import bs58 from "bs58";
import { config } from "../config";
import { SignedTransactionDetails } from "../models/SingedTransactionDetails";

export class CryptoMappClient {
  private static instance: CryptoMappClient;
  private connection: Connection;
  private serviceWallet: Keypair;

  private constructor() {
    this.connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const secretKeyUint8Array = bs58.decode(config.solPrivateKey);
    this.serviceWallet = Keypair.fromSecretKey(secretKeyUint8Array);
  }

  public static getInstance(): CryptoMappClient {
    if (!CryptoMappClient.instance) {
      CryptoMappClient.instance = new CryptoMappClient();
    }
    return CryptoMappClient.instance;
  }

  async submitTransaction(
    signedDetails: SignedTransactionDetails
  ): Promise<string> {
    try {
      // Decode the base58-encoded signed transaction message received from the client
      const serializedTransaction = bs58.decode(signedDetails.message);

      // Convert serialized transaction to Transaction object
      let transaction = Transaction.from(serializedTransaction);

      // Sign the transaction as the fee payer before submission
      transaction.partialSign(this.serviceWallet);

      // Ensure the transaction is fully signed
      if (!transaction.verifySignatures()) {
        throw new Error("Signature verification failed.");
      }

      // Serialize the transaction for submission
      const serializedVersionedTransaction = transaction.serialize();

      // Submit the serialized transaction to the Solana blockchain
      const signature = await this.connection.sendRawTransaction(
        serializedVersionedTransaction,
        {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        }
      );

      // Wait for the transaction to be confirmed
      await this.connection.confirmTransaction(signature, "confirmed");
      console.log("Transaction confirmed with signature:", signature);

      // Construct the Solscan URL
      const solscanUrl = `https://solscan.io/tx/${signature}?cluster=devnet`;
      console.log("Solscan URL:", solscanUrl);

      return signature;
    } catch (error) {
      console.error("Error submitting transaction:", error);
      throw error; // Re-throw the error for external handling if needed
    }
  }
}
