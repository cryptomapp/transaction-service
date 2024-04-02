import { WebSocket } from "ws";
import { TransactionDetails } from "./TransactionDetails";

export interface Session {
  joined: boolean;
  expired: boolean;
  timer?: NodeJS.Timeout;
  transactionDetails?: TransactionDetails;
  merchantSocket?: WebSocket;
  clientSocket?: WebSocket;
}
