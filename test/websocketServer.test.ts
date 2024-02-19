import WebSocket from "ws";
import { config } from "../src/config";
import { startServer } from "../src/websocketServer";
import { TransactionDetails } from "../src/models/TransactionDetails";

jest.mock("../src/utils/generateQRCode", () => ({
  generateQRCode: jest.fn(() =>
    Promise.resolve("data:image/png;base64,mockQRCodeData")
  ),
}));

const PORT = config.port;
let websocketUrl = `ws://localhost:${PORT}`;
let sharedSessionId: string;

describe("WebSocket Server", () => {
  let server: WebSocket.Server | undefined;

  beforeAll(async () => {
    server = await startServer(Number(PORT));
    const address = server.address();
    const actualPort = typeof address === "string" ? null : address?.port;
    if (actualPort) {
      websocketUrl = `ws://localhost:${actualPort}`;
    }
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

  it("should allow a merchant to create a session and receive a session ID", (done) => {
    const merchantId = "merchant-123";
    const transactionDetails: TransactionDetails = {
      amount: 100,
      merchantId: "merchant-123",
      receiverUsdcAccount: "receiverUsdcAccount123",
      daoUsdcAccount: "daoUsdcAccount123",
      stateAccount: "stateAccount123",
    };
    const client = new WebSocket(websocketUrl);

    client.on("open", () => {
      client.send(
        JSON.stringify({
          action: "createSession",
          merchantId,
          transactionDetails,
        })
      );
    });

    client.on("message", (message) => {
      const data = JSON.parse(message.toString());
      if (data.status === "success" && data.action === "sessionCreated") {
        expect(data.sessionId).toBeDefined();
        sharedSessionId = data.sessionId; // Store the created sessionId for the next test
        client.close();
        done();
      }
    });

    client.on("error", (error) => {
      client.close();
      done(error);
    });
  });

  it("should allow a client to join a merchant's session", (done) => {
    if (!sharedSessionId) {
      throw new Error("Session ID not found from the previous test");
    }
    const client = new WebSocket(
      `${websocketUrl}/?sessionId=${sharedSessionId}`
    );

    client.on("open", () => {
      client.send(
        JSON.stringify({
          action: "joinSession",
          sessionId: sharedSessionId,
        })
      );
    });

    client.on("message", (message) => {
      const data = JSON.parse(message.toString());
      if (data.status === "success" && data.action === "joinedSession") {
        expect(data.sessionId).toEqual(sharedSessionId);
        client.close();
        done();
      }
    });

    client.on("error", (error) => {
      client.close();
      done(error);
    });
  });

  it("should allow a client to scan QR code and join the session displaying transaction data", (done) => {
    if (!sharedSessionId) {
      throw new Error("Session ID not found from the previous test");
    }
    const client = new WebSocket(
      `${websocketUrl}/?sessionId=${sharedSessionId}`
    );

    client.on("open", () => {
      // Simulate sending a message that client is ready to receive transaction data
      // This step might vary based on how your actual client-server protocol is designed
      client.send(
        JSON.stringify({
          action: "requestTransactionDetails",
          sessionId: sharedSessionId,
        })
      );
    });

    client.on("message", (message) => {
      const data = JSON.parse(message.toString());
      if (data.status === "success" && data.action === "transactionDetails") {
        console.log("Transaction details received:", data.details);
        expect(data.details).toBeDefined();
        expect(data.details.amount).toEqual(100);
        expect(data.details.merchantId).toEqual("merchant-123");
        expect(data.details.receiverUsdcAccount).toEqual(
          "receiverUsdcAccount123"
        );
        expect(data.details.daoUsdcAccount).toEqual("daoUsdcAccount123");
        expect(data.details.stateAccount).toEqual("stateAccount123");
        client.close();
        done();
      }
    });

    client.on("error", (error) => {
      client.close();
      done(error);
    });
  });

  it("should allow a client to submit a signed transaction", (done) => {
    if (!sharedSessionId) {
      throw new Error("Session ID not found from the previous test");
    }
    const client = new WebSocket(
      `${websocketUrl}/?sessionId=${sharedSessionId}`
    );

    client.on("open", () => {
      // First, simulate the client requesting transaction details
      client.send(
        JSON.stringify({
          action: "requestTransactionDetails",
          sessionId: sharedSessionId,
        })
      );
    });

    client.on("message", (message) => {
      const data = JSON.parse(message.toString());

      // Once transaction details are received, simulate constructing and signing the transaction
      if (data.status === "success" && data.action === "transactionDetails") {
        // Here, you would typically use data.details to construct the transaction
        // For the sake of this test, we'll simulate this with mocked data

        // Simulate client constructing and signing a transaction
        const signedTransactionData = {
          action: "submitTransaction",
          sessionId: sharedSessionId,
          transaction: {
            // Mock data representing the transaction signature and other necessary details
            senderPublicKey: "clientPublicKey123",
            signature: "signedTransactionDataHere",
            // Include any other fields that your server expects
          },
        };

        client.send(JSON.stringify(signedTransactionData));
      } else if (
        data.status === "success" &&
        data.action === "transactionSubmitted"
      ) {
        // This is the response to the submission of the signed transaction
        // Validate the server's response to ensure it processed the transaction
        expect(data).toHaveProperty(
          "result",
          "Transaction processed successfully"
        );
        client.close();
        done();
      }
    });

    client.on("error", (error) => {
      client.close();
      done(error);
    });
  });
});
