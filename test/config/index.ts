import { Keypair, PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";
dotenv.config();

export const config = {
  cryptoMappProgramId:
    process.env.PROGRAM_ADDRESS ||
    "8mDhNcko1rByfWLzVTuddx386JFwFnD3oDPWV2pzBckN",
  merchantUsdcAccountAddress:
    process.env.MERCHANT_USDC_ACCOUNT_ADDRESS ||
    "BbbTVDRijRH6nPDN4gE72Gv3v58icNzpZW6UPb48738r",
  daoUsdcAccountAddress:
    process.env.DAO_USDC_ACCOUNT_ADDRESS ||
    "Ct7dhi3P7sie3Rm989m5LNt6cHrKNsoudwwbREtC5DPy",
  stateAddress:
    process.env.STATE_ADDRESS || "5HzkGM1XFoVrrPLjanQ7Le1Aa4iHPf3aivfKLUztmwFn",
  port: process.env.PORT || 8080,
  timeout: 60000, // 60s
};

const clientPrivateKey = [
  138, 161, 192, 212, 55, 219, 233, 166, 197, 212, 139, 113, 32, 250, 89, 132,
  154, 36, 177, 150, 227, 231, 86, 81, 201, 49, 5, 10, 232, 28, 60, 58, 57, 161,
  171, 225, 237, 11, 101, 103, 223, 82, 2, 188, 59, 235, 229, 129, 32, 221, 109,
  147, 9, 74, 241, 11, 98, 212, 209, 239, 50, 225, 237, 77,
];
export const clientKeypair = Keypair.fromSecretKey(
  new Uint8Array(clientPrivateKey)
);

const merchantPrivateKey = [
  172, 253, 36, 115, 141, 150, 184, 93, 220, 191, 111, 99, 206, 204, 50, 225,
  169, 123, 254, 64, 125, 75, 143, 26, 122, 88, 248, 64, 39, 105, 165, 11, 39,
  16, 247, 121, 224, 240, 12, 171, 10, 137, 241, 181, 103, 62, 181, 88, 14, 89,
  135, 233, 196, 197, 129, 171, 186, 238, 121, 54, 231, 211, 144, 97,
];
export const merchantKeypair = Keypair.fromSecretKey(
  new Uint8Array(merchantPrivateKey)
);

const serviceWalletPrivateKey = [
  23, 116, 182, 62, 242, 18, 4, 233, 81, 138, 243, 169, 167, 182, 204, 27, 37,
  227, 46, 192, 31, 41, 100, 124, 77, 239, 11, 103, 200, 175, 16, 53, 245, 122,
  240, 190, 92, 175, 124, 173, 67, 198, 26, 66, 38, 28, 110, 67, 187, 52, 65,
  112, 61, 24, 43, 197, 176, 1, 185, 190, 2, 204, 4, 229,
];
export const serviceWalletKeypair = Keypair.fromSecretKey(
  new Uint8Array(serviceWalletPrivateKey)
);
