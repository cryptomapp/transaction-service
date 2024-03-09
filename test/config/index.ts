import { Keypair, PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";
dotenv.config();

export const config = {
  cryptoMappProgramId:
    process.env.PROGRAM_ADDRESS ||
    "8mDhNcko1rByfWLzVTuddx386JFwFnD3oDPWV2pzBckN",
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
  8, 50, 212, 107, 172, 95, 82, 179, 102, 92, 240, 6, 170, 20, 194, 175, 49,
  121, 236, 87, 132, 128, 132, 12, 236, 134, 52, 172, 98, 56, 23, 23, 225, 157,
  74, 223, 167, 101, 99, 147, 243, 16, 186, 142, 120, 19, 240, 178, 54, 18, 142,
  186, 2, 117, 74, 230, 246, 108, 154, 235, 218, 82, 181, 52,
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
