import dotenv from "dotenv";
dotenv.config();

export const config = {
  cryptoMappProgramId:
    process.env.PROGRAM_ADDRESS ||
    "8mDhNcko1rByfWLzVTuddx386JFwFnD3oDPWV2pzBckN",
  port: process.env.PORT || 8080,
  timeout: 60000, // 60s
};
