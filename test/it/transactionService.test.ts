import * as anchor from "@coral-xyz/anchor";
import { CryptoMapp } from "../../idl/crypto_mapp";
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
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

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

  const clientPublicKey = clientKeypair.publicKey;
  const clientUsdcAccount = config.clientUsdcAccountAddress;

  const transactionServiceWallet = serviceWalletKeypair;

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

    const transactionDetails: TransactionDetails = {
      amount: transactionAmount,
      merchantId: merchantId,
      merchantUsdcAccount: merchantUsdcAccount,
      daoUsdcAccount: daoUsdcAccount,
      stateAccount: stateAccount,
    };

    merchantWsClient = new WebSocket(websocketUrl);

    merchantWsClient.on("open", () => {
      // Connection is open, now send the message to create a session
      console.log("Merchant WebSocket connection opened.");

      merchantWsClient.send(
        JSON.stringify({
          action: "createSession",
          transactionDetails,
        })
      );
    });

    merchantWsClient.on("message", (message) => {
      // Parse the incoming message
      const data = JSON.parse(message.toString());

      console.log("message: ", data);

      // Check if the session creation was successful
      if (data.status === "success" && data.action === "sessionCreated") {
        console.log("Session created successfully:", data.sessionId);
        // Save or process the sessionId as needed, e.g., generate a QR code
        const sessionId = data.sessionId;
      } else {
        console.error("Failed to create session:", data);
      }
    });

    merchantWsClient.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    merchantWsClient.on("close", (code, reason) => {
      console.log(`WebSocket closed: ${code}, ${reason}`);
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
          expect(data.details.receiverUsdcAccount).toEqual(merchantUsdcAccount);
          expect(data.details.daoUsdcAccount).toEqual(daoUsdcAccount);
          expect(data.details.stateAccount).toEqual(stateAccount);
        }
      }
    });

    // 3. Client build a transaction, sign it, serialize and submit to the server.
    // Prepare program using Anchor
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    console.log("hola");
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

    const transaction = new anchor.web3.Transaction();

    const { blockhash } = await provider.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = serviceWalletKeypair.publicKey;

    transaction.add(executeTransactionInstruction);
    transaction.sign(clientKeypair);

    const transactionSignature = transaction.serialize().toJSON;

    clientWsClient.on("open", () => {
      clientWsClient.send(
        JSON.stringify({
          action: "submitTransaction",
          sessionId: sessionId,
          transactionSignature: transactionSignature,
        })
      );
    });

    // 4. Server receives, deserialize and validate the transaction.
    // 5. Server sign transaction with ServiceWallet and send it on-chain.
    // 6. Server receives response from Solana and notify Client and Merchant.
  });
});
