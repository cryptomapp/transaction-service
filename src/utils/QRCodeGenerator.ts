import QRCode from "qrcode";
import { TransactionDetails } from "../models/TransactionDetails";
import moment from "moment";
import "moment-timezone";
import { getMerchantDetails } from "./merchantUtils";
import { MerchantDetails } from "../models/MerchantDetails";

export async function generateQRCode(
  transactionDetails: TransactionDetails
): Promise<string> {
  try {
    const merchantDetails: MerchantDetails = await getMerchantDetails(
      transactionDetails.merchantId
    );

    // Enhance transactionDetails with current date and time based on merchant's timezone
    const transactionDateTime = moment()
      .tz(merchantDetails.timezone)
      .format("YYYY-MM-DD HH:mm:ss");
    const enhancedTransactionDetails = {
      ...transactionDetails,
      date: transactionDateTime,
      merchantName: merchantDetails.name,
      merchantCity: merchantDetails.city,
      merchantImage: merchantDetails.image,
    };

    // Serialize the enhanced transaction details to a string
    const dataString = JSON.stringify(enhancedTransactionDetails);

    // Generate QR code
    return await QRCode.toDataURL(dataString, {
      errorCorrectionLevel: "H",
    });
  } catch (err) {
    // TODO: Error handling
    console.error("Error generating QR code: ", err);
    throw err;
  }
}
