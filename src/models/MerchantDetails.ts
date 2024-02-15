/**
 * Defines the structure for merchant details.
 */
export type MerchantDetails = {
  /**
   * The unique name of the merchant.
   */
  name: string;

  /**
   * The city where the merchant is located.
   */
  city: string;

  /**
   * The URL to an image representing the merchant.
   */
  image: string;

  /**
   * The IANA timezone string representing the merchant's timezone.
   * Example: "America/New_York"
   */
  timezone: string;
};
