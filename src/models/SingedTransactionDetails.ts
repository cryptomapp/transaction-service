export type SignedTransactionDetails = {
  /**
   * The serialized message, which is expected to be a base58 encoded string
   * containing the transaction details.
   */
  message: string;

  /**
   * Client's signature as a base58 encoded string, proving the client's agreement
   * to the transaction. This is the cryptographic signature generated by the client,
   * signing the transaction details.
   */
  signature: string;

  /**
   * Client's public key as a base58 encoded string, identifying the client within
   * the transaction.
   */
  clientPublicKey: string;
};
