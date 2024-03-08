import { startServer } from "../src/websocketServer";

import WebSocket from "ws";

jest.mock("../src/utils/signatureVerifier", () => ({
  verifyClientSignature: jest.fn().mockResolvedValue(true),
}));

describe.only("WebSocket Server Transaction Flow", () => {
  let server: WebSocket.Server;
  let merchant: WebSocket;
  let client: WebSocket;
  let websocketUrl = `ws://localhost:8080`;
  let sessionId: string;

  beforeAll(async () => {
    server = await startServer(8080);
  });

  afterAll(() => {
    server.close();
  });

  test("Merchant creates a transaction request and Client signs it", (done) => {
    merchant = new WebSocket(websocketUrl);
    client = new WebSocket(websocketUrl);

    merchant.on("open", () => {
      // Merchant Step 1: Create a session
      merchant.send(
        JSON.stringify({
          action: "createSession",
          transactionDetails: {
            amount: 100_000_000,
            merchantId: "merchant-123",
            receiverUsdcAccount: "receiverUsdcAccount123",
            daoUsdcAccount: "daoUsdcAccount123",
            stateAccount: "stateAccount123",
          },
        })
      );
    });

    merchant.on("message", (message) => {
      const data = JSON.parse(message.toString());

      if (data.action === "sessionCreated") {
        sessionId = data.sessionId;
      }
    });

    client.on("open", () => {
      // Client waits a brief moment for the merchant to create the session
      setTimeout(() => {
        // Client Step 2: Join the session using the provided sessionId
        client.send(
          JSON.stringify({
            action: "joinSession",
            sessionId: sessionId,
          })
        );
      }, 500); // Adjust timeout as needed based on test environment
    });

    client.on("message", (message) => {
      const data = JSON.parse(message.toString());

      if (data.action === "joinedSession") {
        // Client Step 3: Request transaction details
        client.send(
          JSON.stringify({
            action: "requestTransactionDetails",
            sessionId: sessionId,
          })
        );
      } else if (data.action === "transactionDetails") {
        // Client Step 4: Submit a signed transaction
        client.send(
          JSON.stringify({
            action: "submitTransaction",
            sessionId: sessionId,
            transaction: {
              // Simulated signed transaction data
              clientPublicKey: "clientPublicKey123",
              clientSignature: "clientSignedTransactionDataHere",
            },
          })
        );
      } else if (data.action === "transactionSubmitted") {
        // Expectation: Server has verified the client's signature successfully
        expect(data.signatureVerified).toBe(true); // This is conceptual; actual implementation depends on server logic

        // Expectation: Server has submitted the transaction to the Solana blockchain
        expect(data.transactionStatus).toBe("success");

        // Final Step: Verify the transaction was processed successfully
        expect(data.result).toBe("Transaction processed successfully");
        client.close();
        done();
      }
    });

    client.on("error", (error) => {
      console.error("WebSocket Error:", error);
      done(error);
    });
  });
});
