import express from "express";
import { json } from "body-parser";
import { Server as HttpServer } from "http";
import { startServer as startWebSocketServer } from "./websocketServer";
import { convertARStoUSDC } from "./utils/blueDollarConverter";
import cors from "cors";

const app = express();
const port = 3000; // HTTP server port
const wsPort = 3001; // WebSocket server port

// Middleware
app.use(json());
app.use(
  cors({
    origin: "http://localhost:9000",
  })
);

// POST endpoint for ARS to USDC conversion
app.post("/convert", async (req, res) => {
  try {
    const { arsAmount } = req.body;
    if (!arsAmount) {
      return res.status(400).send({ error: "ARS amount is required" });
    }
    const usdcValue = await convertARStoUSDC(arsAmount);
    return res.json({ arsAmount, usdcValue });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ error: "Error converting currency" });
  }
});

// Start the HTTP server
const httpServer = new HttpServer(app);
httpServer.listen(port, () => {
  console.log(`HTTP Server listening on http://localhost:${port}`);
});

// Start the WebSocket server
startWebSocketServer(wsPort)
  .then(() => {
    console.log(`WebSocket Server started on ws://localhost:${wsPort}`);
  })
  .catch((error) => {
    console.error("Failed to start WebSocket server:", error);
  });
