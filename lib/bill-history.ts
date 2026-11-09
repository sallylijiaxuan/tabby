import { normalizeItem, isBillCharge, type Charge, type ReceiptItem } from './receipt';
export type Bill = {
  id: string; updatedAt: string; items: ReceiptItem[]; people: string[];
  tax: number; tip: number; tipRate: number | null; tipAfterTax: boolean; restaurant: string;
};
export function restoreBill(data: Omit<Bill, 'id' | 'updatedAt'> & { id?: string; updatedAt?: string; charges?: Charge[] }, id: string): Bill {
  const restored = data.items.map(normalizeItem);
  const extraC = [...(data.charges ?? []), ...restored.filter(i => isBillCharge(i.name)).map(i => ({ id: i.id, name: i.name, amount: i.price * i.quantity }))]
    .reduce((sum, charge) => sum + Math.round(charge.amount * 100), 0);
  return { id: data.id || id, updatedAt: data.updatedAt || new Date().toISOString(),
    items: restored.filter(i => !isBillCharge(i.name)), people: data.people.length ? data.people : ['You'],
    tax: (Math.round(data.tax * 100) + extraC) / 100, tip: data.tip,
    tipRate: typeof data.tipRate === 'number' ? data.tipRate : null,
    tipAfterTax: data.tipAfterTax === true, restaurant: data.restaurant };
}
export function billTotal(bill: Bill) {
  const subtotal = bill.items.reduce((sum, i) => sum + Math.round(i.price * i.quantity * 100), 0);
  const tax = Math.round(bill.tax * 100);
  const tip = bill.tipRate === null ? Math.round(bill.tip * 100) : Math.round((subtotal + (bill.tipAfterTax ? tax : 0)) * bill.tipRate / 100);
  return subtotal + tax + tip;
}
export function updateHistory(history: Bill[], bill: Bill): Bill[] {
  // Keep a single editable record per split rather than a copy per keystroke.
  return [bill, ...history.filter(existing => existing.id !== bill.id)];
}
