// import WebSocket from "ws";
// import { config } from "../src/config";
// import { generateQRCode } from "../src/utils/generateQRCode";

// jest.mock("../src/utils/generateQRCode", () => ({
//   generateQRCode: jest.fn(() =>
//     Promise.resolve("data:image/png;base64,mockQRCodeData")
//   ),
// }));

// const PORT = config.port;
// let websocketUrl = `ws://localhost:${PORT}`;

// describe("WebSocket Server", () => {
//   let server: WebSocket.Server;

//   beforeAll(async () => {
//     server = await require("../src/websocketServer").startServer();
//     const address = server.address();
//     const actualPort = typeof address === "string" ? null : address.port;
//     websocketUrl = `ws://localhost:${actualPort}`;
//   });

//   afterAll((done) => {
//     server.close(done);
//   });

//   it("should allow client to join a session via QR code", async () => {
//     const sessionId = "unique-session-id";
//     // Here, make sure to use `websocketUrl` which has the updated port
//     const qrCodeDataUrl = await generateQRCode(
//       `${websocketUrl}/?sessionId=${sessionId}`
//     );

//     // Now use the updated `websocketUrl` which includes the dynamically assigned port
//     const client = new WebSocket(`${websocketUrl}/?sessionId=${sessionId}`);

//     client.on("open", () => {
//       client.send(JSON.stringify({ action: "joinSession", sessionId }));
//     });

//     // Add assertions to verify the session join process
//     // This might involve checking messages received by the client or other side effects
//   });
// });
