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
import bs58 from "bs58";
import nacl from "tweetnacl";

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

  function createSessionAndGetSessionId(): Promise<string> {
    return new Promise((resolve, reject) => {
      const merchantWsClient = new WebSocket(websocketUrl);

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

    const transaction = new anchor.web3.Transaction();

    const { blockhash } = await provider.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = serviceWalletKeypair.publicKey;

    console.log("Signing by: ", clientKeypair.publicKey);

    transaction.add(executeTransactionInstruction);

    // After adding the instruction but before signing
    const message = transaction.compileMessage();

    // Sign the message using the client's keypair
    const clientSignature = nacl.sign.detached(
      message.serialize(),
      clientKeypair.secretKey
    );

    // Convert the signature and public key to a string format (e.g., base58)
    const signatureStr = bs58.encode(clientSignature);
    const publicKeyStr = clientKeypair.publicKey.toString();

    clientWsClient.send(
      JSON.stringify({
        action: "submitTransaction",
        sessionId: sessionId,
        signedTransactionDetails: {
          message: bs58.encode(message.serialize()), // Serialized message
          signature: signatureStr, // Client's signature
          clientPublicKey: publicKeyStr, // Client's public key
        },
      })
    );

    // 4. Server receives, deserialize and validate the transaction.
    // 5. Server sign transaction with ServiceWallet and send it on-chain.
    // 6. Server receives response from Solana and notify Client and Merchant.
  });
});
