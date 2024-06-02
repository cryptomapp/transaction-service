import { Connection, Keypair, Transaction } from "@solana/web3.js";
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

  async getPriorityFeeEstimate(
    priorityLevel: string,
    serializedTransaction: Buffer
  ) {
    const response = await fetch(
      "https://mainnet.helius-rpc.com/?api-key=a2a4b488-4dea-472e-ab8a-4268a9c5c78c",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          method: "getPriorityFeeEstimate",
          params: [
            {
              transaction: bs58.encode(serializedTransaction),
              options: { priorityLevel: priorityLevel },
            },
          ],
        }),
      }
    );
    const data = await response.json();
    console.log(
      "Fee in function for",
      priorityLevel,
      " :",
      data.result.priorityFeeEstimate
    );
    return data.result;
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

      const priorityFee = this.getPriorityFeeEstimate(
        "HIGH",
        serializedVersionedTransaction
      );

      console.log("priorityFee: ", priorityFee);

      // Fetch the latest blockhash with the processed commitment level
      const latestBlockHash = await this.connection.getLatestBlockhash(
        "processed"
      );

      console.log("sending transaction...");
      // Submit the serialized transaction to the Solana blockchain
      const signature = await this.connection.sendRawTransaction(
        serializedVersionedTransaction,
        {
          skipPreflight: false,
          preflightCommitment: "processed",
          maxRetries: 10, // Increased retries
        }
      );

      console.log("confirming transaction...");
      // Confirm the transaction with the latest valid blockhash information
      await this.connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature,
      });

      // Construct the Solscan URL
      const solscanUrl = `https://solscan.io/tx/${signature}`;
      console.log("confirmed, ", solscanUrl);

      return signature;
    } catch (error) {
      console.error("Error submitting transaction:", error);
      throw error; // Re-throw the error for external handling if needed
    }
  }
}
