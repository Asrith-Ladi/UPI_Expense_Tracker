/** Shared transaction shape from `/api/process` and local edits */
export interface Transaction {
  Date: string;
  Time: string | null;
  'Transaction Details': string;
  'Main Detail': string;
  Tags: string;
  Credit: number;
  Debit: number;
  Amount: number;
  Remarks?: string | null;
}

export interface TransactionRowRef {
  item: Transaction;
  dataIndex: number;
}
