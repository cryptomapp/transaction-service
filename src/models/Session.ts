import { WebSocket } from "ws";
import { TransactionDetails } from "./TransactionDetails";
import { ClientTransactionDetails } from "./ClientTransactionDetails";

export interface Session {
  joined: boolean;
  expired: boolean;
  timer?: NodeJS.Timeout;
  transactionDetails?: TransactionDetails;
  clientTransactionDetails?: ClientTransactionDetails;
  merchantSocket?: WebSocket;
  clientSocket?: WebSocket;
}
