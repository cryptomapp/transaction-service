import {
  ComputeBudgetProgram,
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
    this.connection = new Connection(config.solanaProviderUrl, "confirmed");
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

      console.log("transaction: ", transaction);

      // Add priority fee
      const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
        units: 100_000,
      });

      const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 10_000,
      });

      // transaction.add(modifyComputeUnits);
      // transaction.add(addPriorityFee);

      console.log("[submitTransaction] before partialSign");
      // Sign the transaction as the fee payer before submission
      transaction.partialSign(this.serviceWallet);

      console.log("transaction: ", transaction);
      console.log("[submitTransaction] after partialSign");

      // Ensure the transaction is fully signed
      if (!transaction.verifySignatures()) {
        throw new Error("Signature verification failed.");
      }

      console.log("Before serialisation");

      // Serialize the transaction for submission
      const serializedVersionedTransaction = transaction.serialize();

      console.log("Before sendRawTransaction");
      // Submit the serialized transaction to the Solana blockchain
      const signature = await this.connection.sendRawTransaction(
        serializedVersionedTransaction,
        {
          skipPreflight: false,
          preflightCommitment: "confirmed",
          maxRetries: 5,
        }
      );

      console.log("Before confirmation");

      // Wait for the transaction to be confirmed
      await this.connection.confirmTransaction(signature, "confirmed");
      console.log("Transaction confirmed with signature:", signature);

      // Construct the Solscan URL
      const solscanUrl = `https://solscan.io/tx/${signature}`;
      console.log("Solscan URL:", solscanUrl);

      return signature;
    } catch (error) {
      console.error("Error submitting transaction:", error);
      throw error; // Re-throw the error for external handling if needed
    }
  }
}
