import { normalizeItem, isBillCharge, type Charge, type ReceiptItem } from './receipt';
export type Bill = {
  scanWarnings?: string[]; id: string; mealDate: string; createdAt: string; updatedAt: string; items: ReceiptItem[]; people: string[];
  tax: number; tip: number; tipRate: number | null; tipAfterTax: boolean; restaurant: string;
};
export function localMealDate(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
export function mealDateOf(bill: Pick<Bill,'createdAt'|'updatedAt'> & {mealDate?:string}){return bill.mealDate&&/^\d{4}-\d{2}-\d{2}$/.test(bill.mealDate)?bill.mealDate:localMealDate(new Date(bill.createdAt||bill.updatedAt))}

export function restoreBill(data: Omit<Bill, 'id' | 'mealDate' | 'createdAt' | 'updatedAt'> & { id?: string; mealDate?: string; createdAt?: string; updatedAt?: string; charges?: Charge[] }, id: string): Bill {
  const restored = data.items.map(normalizeItem);
  const extraC = [...(data.charges ?? []), ...restored.filter(i => isBillCharge(i.name)).map(i => ({ id: i.id, name: i.name, amount: i.price * i.quantity }))]
    .reduce((sum, charge) => sum + Math.round(charge.amount * 100), 0);
  return { scanWarnings:data.scanWarnings||[],id: data.id || id, mealDate: data.mealDate||localMealDate(new Date(data.createdAt||data.updatedAt||Date.now())), createdAt: data.createdAt || data.updatedAt || new Date().toISOString(), updatedAt: data.updatedAt || new Date().toISOString(),
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
  const existing=history.find(entry=>entry.id===bill.id);
  return [{...bill,createdAt:existing?.createdAt||bill.createdAt}, ...history.filter(existing => existing.id !== bill.id)];
}

export function groupBillsByDate(history: Bill[]) {
  const groups: { date: string; label: string; bills: Bill[] }[] = [];
  for (const bill of [...history].sort((a,b)=>mealDateOf(b).localeCompare(mealDateOf(a))||Date.parse(b.createdAt||b.updatedAt)-Date.parse(a.createdAt||a.updatedAt))) {
    const date=mealDateOf(bill), added=new Date(`${date}T12:00:00`);
    let group = groups.find(group=>group.date===date);
    if(!group){group={date,label:added.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric',year:'numeric'}),bills:[]};groups.push(group)}
    group.bills.push(bill);
  }
  return groups;
}
