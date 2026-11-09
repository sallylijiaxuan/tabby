export type ReceiptItem = { id: number; name: string; price: number; quantity: number; people: number[] };
export type Charge = { id: number; name: string; amount: number };
export const isBillCharge = (name: string) => /\bn\.?c\.?a\.?\b|non[- ]?cash|surcharge|service\s*(charge|fee)|\bfee\b|adjustment|discount|delivery charge|rounding/i.test(name);

/** Older saved receipts stored the entire row amount in price. */
export function normalizeItem(item: Omit<ReceiptItem, 'quantity'> & { quantity?: number }): ReceiptItem {
  // Some receipts order columns as description, unit price, quantity, amount.
  // Clean these labels even when a previously saved row already has quantity=1.
  const trailing = item.name.match(/^(.*?)\s+\$?(\d+[.,]\d{2})\s+(\d+)\s*$/);
  if (trailing && /[a-z]/i.test(trailing[1]) && Number(trailing[3]) > 0) {
    return { ...item, name: trailing[1].trim(), price: Number(trailing[2].replace(',', '.')), quantity: Number(trailing[3]) };
  }
  if (Number.isInteger(item.quantity) && item.quantity! > 0) return { ...item, quantity: item.quantity! };
  const match = item.name.match(/^(\d+)\s*(?:[x×]\s*|\s+)(.+)$/i);
  const quantity = match && Number(match[1]) > 0 ? Number(match[1]) : 1;
  return { ...item, name: match ? match[2] : item.name, quantity, price: item.price / quantity };
}

export function parseReceipt(text: string) {
  const items: ReceiptItem[] = [], charges: Charge[] = [];
  let tax = 0, tip = 0, afterSubtotal = false;
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (/^sub[- ]?total\b/i.test(line)) { afterSubtotal = true; continue; }
    let match = line.match(/^(.*?)\s*\$?\s*(-?\d+[.,]\d{2})\s*(?:[A-Z*])?$/i);
    if (!match) {
      // Receipts without a separate extended amount can end in unit price + qty.
      const trailing = line.match(/^(.*?)\s+\$?(\d+[.,]\d{2})\s+(\d+)\s*$/);
      if (trailing && Number(trailing[3]) > 0) {
        const amount = Number(trailing[2].replace(',', '.')) * Number(trailing[3]);
        match = [line, line, amount.toFixed(2)] as RegExpMatchArray;
      }
    }
    if (!match) continue;
    let label = match[1].trim().replace(/[.$]+$/, '').trim();
    if (!label && index > 0) label = lines[index - 1];
    if (!label || !/[a-z]/i.test(label)) continue;
    const amount = Number(match[2].replace(',', '.'));
    if (/suggest|recommend/i.test(label)) continue;
    if (/\btax\b/i.test(label)) { tax += amount; afterSubtotal = true; continue; }
    if (/\btip\b|gratuity/i.test(label)) { tip += amount; afterSubtotal = true; continue; }
    if (isBillCharge(label)) {
      charges.push({ id: charges.length + 1, name: label, amount }); continue;
    }
    if (/total|balance|change|visa|mastercard|cash|payment|saving|tender|credit|debit|paid|card|due|suggest|%/i.test(label)) continue;
    if (afterSubtotal) { charges.push({ id: charges.length + 1, name: label, amount }); continue; }
    // A receipt may print quantity, unit price, and extended amount in one row.
    const unit = label.match(/^(.*?)\s+@?\$?(\d+[.,]\d{2})$/);
    if (unit) label = unit[1].trim();
    const suffix = label.match(/^(.*?)\s+[x×]\s*(\d+)$/i) ?? (unit ? label.match(/^(.*?)\s+(\d+)$/) : null);
    if (suffix && Number(suffix[2]) > 0) label = `${suffix[2]} ${suffix[1]}`;
    const normalized = normalizeItem({ id: items.length + 1, name: label, price: amount, people: [] });
    // Amount is authoritative, avoiding double multiplication of receipt quantities.
    items.push(normalized);
  }
  return { items, charges, tax: Math.round(tax * 100) / 100, tip: Math.round(tip * 100) / 100 };
}
