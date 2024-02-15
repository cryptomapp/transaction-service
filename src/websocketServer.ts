import { Server } from "ws";
import { config } from "./config";

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
      const urlParams = new URL(req.url!, `ws://${req.headers.host}`)
        .searchParams;
      const sessionId = urlParams.get("sessionId");

      if (!sessionId) {
        console.log("Session ID not provided.");
        ws.close(1008, "Session ID not provided.");
        return;
      }

      // Check and potentially create a session if it does not exist
      if (!sessions[sessionId]) {
        createSessionWithTimeout(sessionId);
      } else if (sessions[sessionId].expired) {
        // Check if the session has already expired
        ws.send(
          JSON.stringify({
            status: "error",
            error: "Session expired or not found",
          })
        );
        ws.close(1008, "Session expired or not found");
        return;
      }

      console.log(`Client attempting to join with session ID: ${sessionId}`);

      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.action === "joinSession" && data.sessionId === sessionId) {
            sessions[sessionId].joined = true;
            clearTimeout(sessions[sessionId].timer); // Clear the expiration timer
            ws.send(
              JSON.stringify({
                status: "success",
                action: "joinedSession",
                sessionId,
              })
            );
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

export const createSessionWithTimeout = (sessionId: string) => {
  if (!sessions[sessionId] || sessions[sessionId].expired) {
    sessions[sessionId] = { joined: false, expired: false };
    sessions[sessionId].timer = setTimeout(() => {
      sessions[sessionId].expired = true;
      console.log(`Session ${sessionId} expired due to inactivity.`);
    }, timeout);
  }
};
