import { Server } from "ws";
import { config } from "./config";
import { v4 as uuidv4 } from "uuid";
import { TransactionDetails } from "./models/TransactionDetails";
import { Session } from "./models/Session";
import { SignedTransactionDetails } from "./models/SingedTransactionDetails";

const timeout = config.timeout;
const sessions: Record<string, Session> = {};

export const startServer = (port: number): Promise<Server> => {
  return new Promise((resolve, reject) => {
    const server = new Server({ port });

    server.on("listening", () => {
      console.log(`WebSocket server started on port ${port}`);
      resolve(server);
    });

    server.on("error", (error) => {
      reject(error);
    });

    server.on("connection", (ws, req) => {
      ws.on("message", async (message) => {
        try {
          const data = JSON.parse(message.toString());

          if (data.action === "createSession") {
            const sessionId = uuidv4();
            const { transactionDetails } = data;
            createSessionWithTimeout(sessionId, transactionDetails);
            ws.send(
              JSON.stringify({
                status: "success",
                action: "sessionCreated",
                sessionId: sessionId,
              })
            );
            return;
          }

          const sessionId = data.sessionId;
          if (!sessionId) {
            console.log("Session ID not provided.");
            ws.close(1008, "Session ID not provided.");
            return;
          }

          if (!sessions[sessionId]) {
            console.log("Session ID not found.");
            ws.close(1008, "Session ID not found.");
            return;
          } else if (sessions[sessionId].expired) {
            ws.send(
              JSON.stringify({
                status: "error",
                error: "Session expired or not found",
              })
            );
            ws.close(1008, "Session expired or not found");
            return;
          }

          if (
            data.action === "joinSession" &&
            sessions[sessionId] &&
            !sessions[sessionId].expired
          ) {
            sessions[sessionId].joined = true;
            clearTimeout(sessions[sessionId].timer);
            ws.send(
              JSON.stringify({
                status: "success",
                action: "joinedSession",
                sessionId,
              })
            );
          }

          if (data.action === "requestTransactionDetails") {
            const sessionId = data.sessionId;
            if (sessions[sessionId] && !sessions[sessionId].expired) {
              const transactionDetails = sessions[sessionId].transactionDetails;
              ws.send(
                JSON.stringify({
                  status: "success",
                  action: "transactionDetails",
                  details: transactionDetails,
                })
              );
            } else {
              ws.send(
                JSON.stringify({
                  status: "error",
                  error: "Session expired or not found",
                })
              );
            }
            return;
          }

          // if (data.action === "submitTransaction") {
          //   const sessionId = data.sessionId;
          //   const signedTransactionDetails: SignedTransactionDetails =
          //     data.transaction;

          //   try {
          //     const isValidSignature = await verifyClientSignature(
          //       signedTransactionDetails
          //     ); // no longer valid, use transactionValidator

          //     if (!isValidSignature) {
          //       ws.send(
          //         JSON.stringify({
          //           status: "error",
          //           error: "Invalid signature",
          //         })
          //       );
          //       return;
          //     }

          //     // Signature is valid, and session is valid and not expired
          //     if (sessions[sessionId] && !sessions[sessionId].expired) {
          //       // Implement logic to involve the service wallet here

          //       // Send a success message back to the client
          //       ws.send(
          //         JSON.stringify({
          //           status: "success",
          //           action: "transactionSubmitted",
          //           result: "Transaction processed successfully",
          //           signatureVerified: true, // Placeholder
          //           transactionStatus: "success", // This is a placeholder; adjust according to your actual logic
          //         })
          //       );
          //     } else {
          //       // Session is invalid or expired
          //       ws.send(
          //         JSON.stringify({
          //           status: "error",
          //           error: "Invalid or expired session",
          //         })
          //       );
          //     }
          //   } catch (error) {
          //     console.error("Failed to verify signature:", error);
          //     ws.send(
          //       JSON.stringify({
          //         status: "error",
          //         error: "Signature verification failed",
          //       })
          //     );
          //   }
          //   return;
          // }
        } catch (error) {
          console.error("Error processing message:", error);
          ws.close(1002, "Protocol error");
        }
      });
    });

    return server;
  });
};

export const createSessionWithTimeout = (
  sessionId: string,
  transactionDetails: TransactionDetails
) => {
  if (!sessions[sessionId] || sessions[sessionId].expired) {
    sessions[sessionId] = { joined: false, expired: false, transactionDetails };
    sessions[sessionId].timer = setTimeout(() => {
      sessions[sessionId].expired = true;
      console.log(`Session ${sessionId} expired due to inactivity.`);
    }, timeout);
  }
};
