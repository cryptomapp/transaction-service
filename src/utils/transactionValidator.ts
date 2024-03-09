import {
  Transaction,
  PublicKey,
  SystemProgram,
  Connection,
} from "@solana/web3.js";
import { config } from "../config";

/**
 * Validates a serialized transaction received from the client.
 *
 * @param {Buffer} serializedTransaction - The serialized transaction received from the client.
 * @param {Connection} connection - A Solana web3 connection object for fetching account info.
 * @returns {Promise<Transaction>} - The deserialized and validated transaction.
 * @throws {Error} If validation fails.
 */
export const validateTransaction = async (
  serializedTransaction: Buffer,
  connection: Connection
): Promise<Transaction> => {
  // Deserialize the transaction
  let transaction: Transaction;
  try {
    transaction = Transaction.from(serializedTransaction);
  } catch (error) {
    throw new Error("Failed to deserialize transaction");
  }

  // Perform validation checks on the transaction
  // Example: Ensure the transaction only contains expected instruction types, signers, etc.
  // This example does not delve into specifics and assumes you have criteria for validation

  // Here, you'd include validation logic such as checking the transaction's recent blockhash,
  // verifying the signatures, ensuring the correct program IDs are involved, etc.

  // Placeholder for validation logic
  if (!transaction || transaction.instructions.length === 0) {
    throw new Error("Invalid transaction: No instructions found");
  }

  // Example validation: ensure transaction includes an instruction to the expected program
  const expectedProgramId = new PublicKey(config.cryptoMappProgramId);
  const hasExpectedInstruction = transaction.instructions.some((instruction) =>
    instruction.programId.equals(expectedProgramId)
  );
  if (!hasExpectedInstruction) {
    throw new Error("Transaction does not include expected instruction");
  }

  // Add more validations as necessary...

  return transaction;
};
