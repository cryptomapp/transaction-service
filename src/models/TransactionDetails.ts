/**
 * Defines the structure for transaction details.
 */
export type TransactionDetails = {
  /**
   * Transaction amount in smallest currency unit (e.g., cents for USD).
   * For USDC, this represents the amount in the smallest unit,
   * where 100_000_000 represents 100 USDC.
   */
  amount: number;

  /**
   * The unique identifier for the merchant involved in the transaction.
   */
  merchantId: string;

  /**
   * The USDC account address of the receiver in the transaction.
   */
  receiverUsdcAccount: string;

  /**
   * The USDC account address for the DAO involved in the transaction.
   */
  daoUsdcAccount: string;

  /**
   * The state account used in the transaction.
   */
  stateAccount: string;
};
