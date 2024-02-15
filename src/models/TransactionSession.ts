export type TransactionState =
  | "pending"
  | "clientSigned"
  | "submitted"
  | "confirmed";

export interface TransactionDetails {
  amount: number;
  recipient: string;
}

export class TransactionSession {
  sessionId: string;
  transactionDetails: TransactionDetails;
  state: TransactionState;
  clientSignature?: string; // Client's signature, initially undefined

  constructor(sessionId: string, transactionDetails: TransactionDetails) {
    this.sessionId = sessionId;
    this.transactionDetails = transactionDetails;
    this.state = "pending";
  }
}
