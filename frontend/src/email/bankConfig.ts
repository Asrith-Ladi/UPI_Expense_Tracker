/** Bank labels (CAPS) and Gmail search keywords. Only AXIS is active for now. */
export type BankId = 'AXIS' | 'HDFC' | 'SBI' | 'CANARA';

export const BANK_OPTIONS: { id: BankId; display: string; query: string; enabled: boolean }[] = [
  { id: 'AXIS', display: 'AXIS', query: 'axis', enabled: true },
  { id: 'HDFC', display: 'HDFC', query: 'hdfc', enabled: false },
  { id: 'SBI', display: 'SBI', query: 'sbi', enabled: false },
  { id: 'CANARA', display: 'CANARA', query: 'canara', enabled: false },
];
