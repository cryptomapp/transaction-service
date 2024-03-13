import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  PublicKey,
} from "@solana/web3.js";
import WebSocket from "ws";
import { startServer } from "../../src/websocketServer";
import {
  clientKeypair,
  config,
  merchantKeypair,
  serviceWalletKeypair,
} from "../config";
import { TransactionDetails } from "../../src/models/TransactionDetails";

describe("Transaction Service Integration Tests", () => {
  // Solana
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );
  console.log("Connected to Solana");

  const transactionAmount = 1_000_000; // 1 USDC
  const merchantId = "7"; // MerchantID #7
  const merchantUsdcAccount = config.merchantUsdcAccountAddress;
  const daoUsdcAccount = config.daoUsdcAccountAddress;
  const stateAccount = config.stateAddress;

  // Server
  const PORT = config.port;
  let server: WebSocket.Server | undefined;
  let websocketUrl: string;
  let sessionId: string;
  let merchantWsClient: WebSocket;
  let clientWsClient: WebSocket;

  async function airdropIfEmpty(publicKey: PublicKey) {
    const balance = await connection.getBalance(publicKey);
    if (balance < LAMPORTS_PER_SOL * 0.1) {
      console.log("Requested airdrop for ", publicKey);
      await connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL);
    }
  }

  beforeAll(async () => {
    // Check balances and airdrop if necessary
    airdropIfEmpty(serviceWalletKeypair.publicKey);

    // Start server
    server = await startServer(Number(PORT));
    const address = server.address();
    const actualPort = typeof address === "string" ? null : address?.port;
    if (actualPort) {
      websocketUrl = `ws://localhost:${actualPort}`;
    }
    console.log("Server started at: ", websocketUrl);
  });

  afterAll((done) => {
    if (server) {
      server.close(() => {
        console.log("Server closed");
        done();
      });
    } else {
      done();
    }
  });

  it("POSITIVE: Merchant requests execution of transaction from Client gasless", async () => {
    // 1. Merchant initiate a session with transaction details, requested amount, generates sessionId.
    // UX: Merchant generates QR code.
    merchantWsClient = new WebSocket(websocketUrl);

    const transactionDetails: TransactionDetails = {
      amount: transactionAmount,
      merchantId: merchantId,
      merchantUsdcAccount: merchantUsdcAccount,
      daoUsdcAccount: daoUsdcAccount,
      stateAccount: stateAccount,
    };

    merchantWsClient.on("open", () => {
      merchantWsClient.send(
        JSON.stringify({
          action: "createSession",
          transactionDetails,
        })
      );
    });

    merchantWsClient.on("message", (message) => {
      const data = JSON.parse(message.toString());
      if (data.status === "success" && data.action === "sessionCreated") {
        expect(data.sessionId).toBeDefined();
        sessionId = data.sessionId;
      }
    });

    // 2. Client joins the session and fetch transaction data.
    // UX: Client scans QR code.
    clientWsClient = new WebSocket(`${websocketUrl}/${sessionId}`);

    clientWsClient.on("open", () => {
      clientWsClient.send(
        JSON.stringify({
          action: "joinSession",
          sessionId: sessionId,
        })
      );
    });

    clientWsClient.on("message", (message) => {
      const data = JSON.parse(message.toString());
      if (data.status === "success" && data.action === "joinedSession") {
        expect(data.sessionId).toEqual(sessionId);
      }
    });

    clientWsClient.on("open", () => {
      clientWsClient.send(
        JSON.stringify({
          action: "requestTransactionDetails",
          sessionId: sessionId,
        })
      );
    });

    clientWsClient.on("message", (message) => {
      const data = JSON.parse(message.toString());
      if (data.status === "success" && data.action === "transactionDetails") {
        expect(data.details).toBeDefined();
        expect(data.details.amount).toEqual(transactionAmount);
        expect(data.details.merchantId).toEqual(merchantId);
        expect(data.details.receiverUsdcAccount).toEqual(merchantUsdcAccount);
        expect(data.details.daoUsdcAccount).toEqual(daoUsdcAccount);
        expect(data.details.stateAccount).toEqual(stateAccount);
      }
    });

    // 3. Client build a transaction, sign it, serialize and submit to the server.
    // 4. Server receives, deserialize and validate the transaction.
    // 5. Server sign transaction with ServiceWallet and send it on-chain.
    // 6. Server receives response from Solana and notify Client and Merchant.
  });
});
