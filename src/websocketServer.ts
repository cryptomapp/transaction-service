import { AddressInfo, WebSocketServer } from "ws";
import { generateQRCode } from "./utils/generateQRCode";
import {
  TransactionSession,
  TransactionDetails,
} from "./models/TransactionSession";
import { v4 as uuidv4 } from "uuid";
import { config } from "./config";

const sessions: { [sessionId: string]: TransactionSession } = {};

export const startServer = (port?: number): Promise<WebSocketServer> => {
  const server = new WebSocketServer({ port: port || 0 });

  server.on("listening", () => {
    const actualPort = (server.address() as AddressInfo).port;
    console.log(`WebSocket server started on port ${actualPort}`);
  });

  server.on("connection", (ws, req) => {
    const urlParams = new URL(req.url!, `ws://${req.headers.host}`)
      .searchParams;
    const sessionId = urlParams.get("sessionId");

    if (!sessionId || !sessions[sessionId]) {
      console.log("Session ID not provided or session not found.");
      ws.close(1008, "Session not found or invalid.");
      return;
    }

    console.log(`Client connected with session ID: ${sessionId}`);
    const session = sessions[sessionId];

    // Assuming you might want to send initial transaction details to the client
    ws.send(
      JSON.stringify({ action: "init", details: session.transactionDetails })
    );

    ws.on("message", (message) => {
      // Handle messages from the client
      // Example: Client sends back a signature
      const data = JSON.parse(message.toString());
      if (data.action === "submitSignature" && data.signature) {
        console.log(`Received signature for session ID: ${sessionId}`);
        // Update session with client's signature and change state
        session.clientSignature = data.signature;
        session.state = "clientSigned";
        // Further processing, like submitting the transaction to Solana
      }
    });
  });

  return Promise.resolve(server);
};

// Example function to create a new transaction session and generate a QR code
export const createTransactionSession = async (
  transactionDetails: TransactionDetails
): Promise<string> => {
  const sessionId = uuidv4();
  const session = new TransactionSession(sessionId, transactionDetails);
  sessions[sessionId] = session;

  const qrCodeDataUrl = await generateQRCode(
    `ws://localhost:${config.port}/?sessionId=${sessionId}`
  );
  console.log(`QR Code for session ID ${sessionId}: ${qrCodeDataUrl}`);
  return qrCodeDataUrl;
};
