import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  TransactionConfirmationStatus,
} from "@solana/web3.js";
import { validateTransaction } from "../../src/utils/transactionValidator";

const clientPrivateKey = [
  138, 161, 192, 212, 55, 219, 233, 166, 197, 212, 139, 113, 32, 250, 89, 132,
  154, 36, 177, 150, 227, 231, 86, 81, 201, 49, 5, 10, 232, 28, 60, 58, 57, 161,
  171, 225, 237, 11, 101, 103, 223, 82, 2, 188, 59, 235, 229, 129, 32, 221, 109,
  147, 9, 74, 241, 11, 98, 212, 209, 239, 50, 225, 237, 77,
];
const clientKeypair = Keypair.fromSecretKey(new Uint8Array(clientPrivateKey));

const merchantPrivateKey = [
  177, 102, 230, 198, 255, 225, 138, 175, 77, 20, 173, 246, 207, 55, 229, 116,
  153, 134, 218, 106, 26, 89, 144, 8, 182, 69, 113, 237, 186, 216, 105, 238,
  192, 80, 116, 253, 20, 116, 84, 122, 11, 95, 239, 77, 60, 59, 49, 203, 209,
  227, 9, 233, 68, 50, 9, 79, 142, 94, 90, 216, 197, 202, 217, 180,
];
const merchantKeypair = Keypair.fromSecretKey(
  new Uint8Array(merchantPrivateKey)
);

describe.only("Transaction Service Integration Tests", () => {
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  beforeAll(async () => {
    // Check balances and airdrop if necessary
    const clientBalance = await connection.getBalance(clientKeypair.publicKey);
    if (clientBalance < LAMPORTS_PER_SOL * 0.1) {
      await connection.requestAirdrop(
        clientKeypair.publicKey,
        LAMPORTS_PER_SOL
      );
    }

    const merchantBalance = await connection.getBalance(
      merchantKeypair.publicKey
    );
    if (merchantBalance < LAMPORTS_PER_SOL * 0.1) {
      await connection.requestAirdrop(
        merchantKeypair.publicKey,
        LAMPORTS_PER_SOL
      );
    }
  });

  it("Client submits a transaction to the server, and the server processes it", async () => {
    // Fetch the latest blockhash
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    // Assume client creates a transaction to pay the merchant
    const transaction = new Transaction({
      feePayer: clientKeypair.publicKey,
      recentBlockhash: blockhash,
    }).add(
      SystemProgram.transfer({
        fromPubkey: clientKeypair.publicKey,
        toPubkey: merchantKeypair.publicKey,
        lamports: 50000, // For example, 0.00005 SOL
      })
    );

    // Client signs the transaction
    transaction.sign(clientKeypair);

    // Serialize the transaction for submission to the server
    const serializedTransaction = transaction.serialize();

    // Simulate server processing
    // For this example, assume validateTransaction deserializes, validates, and submits the transaction
    const signature = await connection.sendRawTransaction(
      serializedTransaction,
      { skipPreflight: true }
    );

    // Construct the strategy object for confirming the transaction
    const confirmationStrategy = {
      signature,
      blockhash,
      lastValidBlockHeight,
    };

    // Confirm the transaction
    const confirmation = await connection.confirmTransaction(
      confirmationStrategy,
      "confirmed"
    );

    // Check the transaction was successful
    expect(confirmation.value.err).toBeNull();

    // Optionally, verify the merchant's balance increased
    const newMerchantBalance = await connection.getBalance(
      merchantKeypair.publicKey
    );
    const initialMerchantBalance = 0; // Replace with the initial balance, if available
    expect(newMerchantBalance).toBeGreaterThan(initialMerchantBalance);
  });
});
