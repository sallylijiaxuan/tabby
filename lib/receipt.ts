export function parseReceipt(text: string) {
  const items: { id: number; name: string; price: number; people: number[] }[] = [];
  let tax = 0, tip = 0;
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    // Accept currency symbols, comma decimals, and trailing tax markers.
    const match = line.match(/^(.*?)\s*\$?\s*(\d+[.,]\d{2})\s*(?:[A-Z*])?$/i);
    if (!match) continue;
    let label = match[1].trim().replace(/[.$]+$/, '').trim();
    if (!label && index > 0) label = lines[index - 1];
    if (!label || !/[a-z]/i.test(label)) continue;
    const price = Number(match[2].replace(',', '.'));
    if (/suggest|recommend|%/.test(label.toLowerCase())) continue;
    if (/\btax\b/i.test(label)) { tax += price; continue; }
    if (/\btip\b|gratuity/i.test(label)) { tip += price; continue; }
    if (/total|balance|change|visa|mastercard|cash|payment|discount|saving|amount|tender|credit|debit|paid|card|due/i.test(label)) continue;
    items.push({ id: items.length + 1, name: label, price, people: [] });
  }
  return { items, tax: Math.round(tax * 100) / 100, tip: Math.round(tip * 100) / 100 };
}
