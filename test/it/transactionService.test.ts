import * as anchor from "@coral-xyz/anchor";
import { CryptoMapp } from "../../idl/crypto_mapp";
import {
  Connection,
  LAMPORTS_PER_SOL,
  Transaction,
  PublicKey,
} from "@solana/web3.js";
import WebSocket from "ws";
import { startServer } from "../../src/websocketServer";
import { clientKeypair, config, serviceWalletKeypair } from "../config";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import bs58 from "bs58";

describe.only("Transaction Service Integration Tests", () => {
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

  const clientPublicKey = clientKeypair.publicKey;
  const clientUsdcAccount = config.clientUsdcAccountAddress;

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

  async function createSessionAndGetSessionId(): Promise<string> {
    return new Promise((resolve, reject) => {
      merchantWsClient = new WebSocket(websocketUrl);

      merchantWsClient.on("open", () => {
        console.log("Merchant WebSocket connection opened.");
        merchantWsClient.send(
          JSON.stringify({
            action: "createSession",
            transactionDetails: {
              amount: transactionAmount,
              merchantId: merchantId,
              merchantUsdcAccount: merchantUsdcAccount,
              daoUsdcAccount: daoUsdcAccount,
              stateAccount: stateAccount,
            },
            clientTransactionDetails: {
              address: "address",
              amount: "20000",
              name: "name",
              currency: "USDC",
              city: "Buenos Aires",
              date: "today",
            },
          })
        );
      });

      merchantWsClient.on("message", (message) => {
        const data = JSON.parse(message.toString());
        if (data.status === "success" && data.action === "sessionCreated") {
          console.log("Session created successfully:", data.sessionId);
          resolve(data.sessionId);
        } else {
          reject(new Error("Failed to create session"));
        }
      });

      merchantWsClient.on("error", (error) => {
        console.error("WebSocket error:", error);
        reject(error);
      });
    });
  }

  beforeAll(async () => {
    // Check balances and airdrop if necessary
    await airdropIfEmpty(serviceWalletKeypair.publicKey);

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

    try {
      sessionId = await createSessionAndGetSessionId();
      console.log("Session ID:", sessionId);
      // Proceed with using sessionId for the client to join the session and fetch transaction data...
    } catch (error) {
      console.error("Error in session creation:", error);
    }

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

      // Handle the joinedSession response
      if (data.status === "success") {
        if (data.action === "joinedSession") {
          expect(data.sessionId).toEqual(sessionId);

          // After successfully joining the session, request the transaction details.
          clientWsClient.send(
            JSON.stringify({
              action: "requestTransactionDetails",
              sessionId: sessionId,
            })
          );
        } else if (data.action === "transactionDetails") {
          // Handle the transaction details response
          expect(data.details).toBeDefined();
          expect(data.details.amount).toEqual(transactionAmount);
          expect(data.details.merchantId).toEqual(merchantId);
          expect(data.details.merchantUsdcAccount).toEqual(merchantUsdcAccount);
          expect(data.details.daoUsdcAccount).toEqual(daoUsdcAccount);
          expect(data.details.stateAccount).toEqual(stateAccount);

          console.log("HERE");
          console.log(data.details.clientTransactionDetails);
        }
      }
    });

    // 3. Client build a transaction, sign it, serialize and submit to the server.
    // Prepare program using Anchor
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.CryptoMapp as anchor.Program<CryptoMapp>;

    // Create executeTransactionInstruction
    const executeTransactionInstruction = await program.methods
      .executeTransaction(new anchor.BN(transactionAmount))
      .accounts({
        sender: clientPublicKey,
        senderUsdcAccount: clientUsdcAccount,
        receiverUsdcAccount: merchantUsdcAccount,
        daoUsdcAccount: daoUsdcAccount,
        state: stateAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    const transaction = new Transaction().add(executeTransactionInstruction);

    // Set the recent blockhash and fee payer (if not already set)
    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;
    transaction.feePayer = new PublicKey(
      "HyZWBzi5EH9mm7FFhpAHQArm5JyY1KPeWgSxMN6YZdJy"
    );

    // Sign the transaction with the client's keypair
    transaction.partialSign(clientKeypair);

    // Serialize the fully signed transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
    });

    // Encode the serialized transaction for sending
    const encodedTransaction = bs58.encode(serializedTransaction);

    clientWsClient.send(
      JSON.stringify({
        action: "submitTransaction",
        sessionId: sessionId,
        signedTransactionDetails: {
          message: encodedTransaction,
        },
      })
    );

    // 4. Server receives response from Solana and notify Client and Merchant.
    const merchantFeedbackPromise = new Promise((resolve, reject) => {
      merchantWsClient.once("message", (data) => {
        const response = JSON.parse(data.toString());
        if (
          response.status === "success" &&
          response.message === "Transaction processed" &&
          response.solscanUrl
        ) {
          resolve("Merchant received success feedback");
        } else {
          reject(new Error("Merchant did not receive expected feedback"));
        }
      });
    });

    const clientFeedbackPromise = new Promise((resolve, reject) => {
      clientWsClient.once("message", (data) => {
        const response = JSON.parse(data.toString());
        if (
          response.status === "success" &&
          response.message === "Transaction processed" &&
          response.solscanUrl
        ) {
          resolve("Client received success feedback");
        } else {
          reject(new Error("Client did not receive expected feedback"));
        }
      });
    });

    // Wait for both feedback promises to resolve, indicating that both the merchant and client received the correct feedback.
    await Promise.all([merchantFeedbackPromise, clientFeedbackPromise]);
  });
});
