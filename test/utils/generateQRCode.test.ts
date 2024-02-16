import { TransactionDetails } from "../../src/models/TransactionDetails";
import { generateQRCode } from "../../src/utils/generateQRCode";
import * as merchantUtils from "../../src/utils/merchantUtils";
import moment from "moment-timezone";

// Mock fetching merchant details and the current time to return static data for testing
jest.mock("../../src/utils/merchantUtils", () => ({
  getMerchantDetails: jest.fn().mockResolvedValue({
    name: "Test Merchant",
    city: "Test City",
    image: "http://example.com/image.png",
    timezone: "America/New_York",
  }),
}));

// Mock moment-timezone if your QR code generation logic uses it for formatting date/time
jest.mock("moment-timezone", () => {
  const actualMoment = jest.requireActual("moment-timezone");
  return {
    ...actualMoment,
    tz: jest.fn().mockImplementation((...args) => actualMoment.tz(...args)),
  };
});

describe("QR Code Generation with Transaction, Merchant Details, and Current DateTime", () => {
  it("should generate a QR code with transaction amount, merchant info, and current date/time", async () => {
    // Setup: Define a transaction amount and mock merchant details
    const transactionDetails: TransactionDetails = {
      amount: 100000000, // 100 USDC
      merchantId: "merchant123",
      receiverUsdcAccount: "",
      daoUsdcAccount: "",
      stateAccount: "",
    };

    // Generate the QR code with the provided transaction details
    // The generateQRCode function is expected to internally fetch merchant details and handle date/time formatting
    const qrCodeDataUrl = await generateQRCode(transactionDetails);

    // Assertions to verify the QR code has been generated correctly
    expect(qrCodeDataUrl).toBeDefined();
    expect(qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);

    // Verify that getMerchantDetails was called with the correct merchant ID
    expect(merchantUtils.getMerchantDetails).toHaveBeenCalledWith(
      transactionDetails.merchantId
    );
  });
});
