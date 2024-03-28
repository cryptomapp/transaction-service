import dotenv from "dotenv";
dotenv.config();

export const config = {
  cryptoMappProgramId:
    process.env.PROGRAM_ADDRESS ||
    "8mDhNcko1rByfWLzVTuddx386JFwFnD3oDPWV2pzBckN",
  solPrivateKey:
    process.env.SERVICE_WALLET ||
    "4GVrk3J7GB8a29RqqBG6x9WZieDufp3ngPc6zcRH3JzfQN3WxLjMbgf98feTWdivSoXxM5EqpQQtzZzrAG6qJDMs",
  stateAddress:
    process.env.STATE_ADDRESS || "5HzkGM1XFoVrrPLjanQ7Le1Aa4iHPf3aivfKLUztmwFn",
  port: process.env.PORT || 8080,
  timeout: 60000, // 60s
};
