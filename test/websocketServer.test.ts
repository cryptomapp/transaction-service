import WebSocket from "ws";
import { config } from "../src/config";
import { createSessionWithTimeout, startServer } from "../src/websocketServer";

jest.mock("../src/utils/generateQRCode", () => ({
  generateQRCode: jest.fn(() =>
    Promise.resolve("data:image/png;base64,mockQRCodeData")
  ),
}));

const PORT = config.port;
let websocketUrl = `ws://localhost:${PORT}`;

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
      done(); // Complete the teardown if the server was never initialized
    }
  });

  it("should allow client to join a session via QR code", (done) => {
    const sessionId = "unique-session-id";
    const client = new WebSocket(`${websocketUrl}/?sessionId=${sessionId}`);
    let doneCalled = false;

    client.on("open", () => {
      client.send(JSON.stringify({ action: "joinSession", sessionId }));
    });

    client.on("message", (message) => {
      const data = JSON.parse(message.toString());
      if (
        data.status === "success" &&
        data.action === "joinedSession" &&
        data.sessionId === sessionId &&
        !doneCalled
      ) {
        doneCalled = true;
        client.close(); // Ensure the client is closed after successful test
        done();
      }
    });

    client.on("error", (error) => {
      if (!doneCalled) {
        doneCalled = true;
        done(error);
      }
    });
  });

  it("should expire a session if not joined within 60 seconds", (done) => {
    jest.useFakeTimers();

    const sessionId = "session-to-expire";
    // Simulate session creation and expiration
    createSessionWithTimeout(sessionId); // Assuming this function is accessible for the test

    jest.advanceTimersByTime(65000); // Simulate waiting for 65 seconds

    const client = new WebSocket(`${websocketUrl}/?sessionId=${sessionId}`);
    let doneCalled = false;

    client.on("open", () => {
      client.send(JSON.stringify({ action: "joinSession", sessionId }));
    });

    client.on("message", (message) => {
      const data = JSON.parse(message.toString());
      if (
        data.status === "error" &&
        data.error === "Session expired or not found" &&
        !doneCalled
      ) {
        doneCalled = true;
        client.close();
        done();
      }
    });

    client.on("error", (error) => {
      if (!doneCalled) {
        doneCalled = true;
        done(error);
      }
    });
  }, 70000);
});
