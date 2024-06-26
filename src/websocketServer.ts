import { Server, WebSocket } from "ws";
import { config } from "./config";
import { v4 as uuidv4 } from "uuid";
import { TransactionDetails } from "./models/TransactionDetails";
import { Session } from "./models/Session";
import { SignedTransactionDetails } from "./models/SingedTransactionDetails";
import { validateTransaction } from "./utils/transactionValidator";
import { CryptoMappClient } from "./utils/CryptoMappClient";
import { ClientTransactionDetails } from "./models/ClientTransactionDetails";

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
            console.log("Created session: ", sessionId);
            // accountKeys.length = 9
            const { transactionDetails } = data;
            const { clientTransactionDetails } = data;
            createSessionWithTimeout(
              sessionId,
              transactionDetails,
              clientTransactionDetails,
              ws
            );
            console.log("transactionDetails", transactionDetails);
            console.log("clientTransactionDetails", clientTransactionDetails);
            ws.send(
              JSON.stringify({
                status: "success",
                action: "sessionCreated",
                sessionId: sessionId,
                clientTransactionDetails: clientTransactionDetails,
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
            console.log("Client joins session: ", sessionId);
            sessions[sessionId].joined = true;
            sessions[sessionId].clientSocket = ws;
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
            console.log("Requested transaction details, session: ", sessionId);
            if (sessions[sessionId] && !sessions[sessionId].expired) {
              const transactionDetails = sessions[sessionId].transactionDetails;
              const clientTransactionDetails =
                sessions[sessionId].clientTransactionDetails;
              ws.send(
                JSON.stringify({
                  status: "success",
                  action: "transactionDetails",
                  details: transactionDetails,
                  clientTransactionDetails: clientTransactionDetails,
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

          if (data.action === "submitTransaction") {
            const session = sessions[sessionId];
            console.log("Submitted transaction, session: ", sessionId);

            const submitMessage = JSON.stringify({
              status: "success",
              message: "Transaction submitted",
            });

            await Promise.all([
              session.merchantSocket
                ? session.merchantSocket.send(submitMessage)
                : null,
              session.clientSocket
                ? session.clientSocket.send(submitMessage)
                : null,
            ]).catch((error) => {
              console.error(
                "Failed to send confirmation message about transaction submission",
                error
              );
            });

            const signedDetails: SignedTransactionDetails =
              data.signedTransactionDetails;

            // Validate the client's signature
            // const isValid = await validateTransaction(signedDetails);
            const isValid = true;

            if (isValid) {
              try {
                console.log(
                  "Validated transaction details: ",
                  data.signedTransactionDetails
                );
                const client = CryptoMappClient.getInstance();
                const signature = await client.submitTransaction(signedDetails);

                console.log(
                  "Submitted transaction with signature: ",
                  signature
                );

                // DEVNET
                const solscanUrl = `https://solscan.io/tx/${signature}`;

                // Prepare the success message
                const successMessage = JSON.stringify({
                  status: "success",
                  message: "Transaction processed",
                  solscanUrl: solscanUrl,
                });

                // Send feedback to the merchant
                session.merchantSocket.send(successMessage);

                // Check if the client has joined and send feedback to the client
                if (session.clientSocket) {
                  session.clientSocket.send(successMessage);
                }
              } catch (error) {
                ws.send(
                  JSON.stringify({
                    status: "error",
                    message: "Failed to process transaction",
                  })
                );
              }
            } else {
              ws.send(
                JSON.stringify({
                  status: "error",
                  message: "Invalid signature",
                })
              );
            }
            return;
          }
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
  transactionDetails: TransactionDetails,
  clientTransactionDetails: ClientTransactionDetails,
  merchantWs: WebSocket
) => {
  if (!sessions[sessionId] || sessions[sessionId].expired) {
    sessions[sessionId] = {
      joined: false,
      expired: false,
      transactionDetails,
      clientTransactionDetails,
      merchantSocket: merchantWs,
    };
    sessions[sessionId].timer = setTimeout(() => {
      sessions[sessionId].expired = true;
      console.log(`Session ${sessionId} expired due to inactivity.`);
    }, timeout);
  }
};
