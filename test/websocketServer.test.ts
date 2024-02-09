import WebSocket from "ws";
import { config } from "../src/config";

const PORT = config.port;
const websocketUrl = `ws://localhost:${PORT}`;

describe("WebSocket Server", () => {
  let server: WebSocket.Server;

  beforeAll(() => {
    server = require("../src/websocketServer").startServer(PORT);
  });

  afterAll((done) => {
    server.close(done);
  });

  it("should accept connections", (done) => {
    const client = new WebSocket(websocketUrl);

    client.on("open", () => {
      expect(client.readyState).toBe(WebSocket.OPEN);
      client.close();
      done();
    });
  });
});
