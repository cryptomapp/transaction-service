import WebSocket from "ws";

export const startServer = (port: number) => {
  const server = new WebSocket.Server({ port });

  server.on("connection", (ws) => {
    console.log("Client connected");

    // Handle incoming messages here if needed
    ws.on("message", (message) => {
      console.log(`Received message: ${message}`);
    });

    // Optionally send a welcome message or similar
    ws.send("Welcome to the WebSocket server");
  });

  console.log(`WebSocket server started on port ${port}`);
  return server;
};
