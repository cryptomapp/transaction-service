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

  let merchantId: string;
  let merchantUsdcAccount: string;
  let daoUsdcAccount: string;
  let stateUsdcAccount: string;

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

  it("POSSITIVE: Merchant receives 1 USDC from Client gasless", async () => {
    // 1. Merchant initiate a session with requested amount and receives sessionId.
    // UX: Merchant generates QR code.
    merchantWsClient = new WebSocket(websocketUrl);

    const transactionDetails: TransactionDetails = {
      amount: transactionAmount,
      merchantId: merchantId,
      receiverUsdcAccount: merchantUsdcAccount,
      daoUsdcAccount: daoUsdcAccount,
      stateAccount: stateUsdcAccount,
    };

    merchantWsClient.on("open", () => {
      merchantWsClient.send(
        JSON.stringify({
          action: "createSession",
          merchantId,
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

    // TODO: not sure if Merchant is in the room

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
        expect(data.details.stateAccount).toEqual(stateUsdcAccount);
      }
    });

    // 3. Client build a transaction, sign it, serialize and submit to the server.
    // 4. Server receives, deserialize and validate the transaction.
    // 5. Server sign transaction with ServiceWallet and send it on-chain.
    // 6. Server receives response from Solana and notify Client and Merchant.
  });

  it.skip("Client submits a transaction to the server, and the server processes it", async () => {
    // Fetch the latest blockhash
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    // Assume client creates a transaction to pay the merchant
    const transaction = new Transaction({
      feePayer: clientKeypair.publicKey,
      recentBlockhash: blockhash,
    }).add(
      SystemProgram.transfer({
        fromPubkey: clientKeypair.publicKey,
        toPubkey: merchantKeypair.publicKey,
        lamports: 50000, // For example, 0.00005 SOL
      })
    );

    // Client signs the transaction
    transaction.sign(clientKeypair);

    // Serialize the transaction for submission to the server
    const serializedTransaction = transaction.serialize();

    // Simulate server processing
    // For this example, assume validateTransaction deserializes, validates, and submits the transaction
    const signature = await connection.sendRawTransaction(
      serializedTransaction,
      { skipPreflight: true }
    );

    // Construct the strategy object for confirming the transaction
    const confirmationStrategy = {
      signature,
      blockhash,
      lastValidBlockHeight,
    };

    // Confirm the transaction
    const confirmation = await connection.confirmTransaction(
      confirmationStrategy,
      "confirmed"
    );

    // Check the transaction was successful
    expect(confirmation.value.err).toBeNull();

    // Optionally, verify the merchant's balance increased
    const newMerchantBalance = await connection.getBalance(
      merchantKeypair.publicKey
    );
    const initialMerchantBalance = 0; // Replace with the initial balance, if available
    expect(newMerchantBalance).toBeGreaterThan(initialMerchantBalance);
  });
});
