/**
 * Defines the structure for transaction details.
 */
export type TransactionDetails = {
  /**
   * Transaction amount in smallest currency unit (USDC).
   * 100_000_000 represents 100 USDC.
   */
  amount: number;

  /**
   * MerchantId NFT
   */
  merchantId: string;

  /**
   * The USDC account address of the Merchant in the transaction.
   */
  merchantUsdcAccount: string;

  /**
   * The USDC account address for the DAO Treasury involved in the transaction.
   */
  daoUsdcAccount: string;

  /**
   * The CryptoMapp State account used in the transaction.
   */
  stateAccount: string;
};
