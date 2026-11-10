import assert from 'node:assert/strict';
import {parseReceipt, normalizeItem} from '../lib/receipt.ts';
const result=parseReceipt('DINNER\nBurger $18.00\nSalad 12,00 T\nSUBTOTAL 30.00\nSALES TAX 3.00\nTIP 6.00\nTOTAL 39.00\nVISA 39.00\nSuggested tip 20% 7.80');
assert.deepEqual(result.items.map(({name,price})=>({name,price})),[{name:'Burger',price:18},{name:'Salad',price:12}]);
assert.equal(result.tax,3);assert.equal(result.tip,6);
assert.equal(parseReceipt('Pizza\n$24.00').items[0].name,'Pizza');
assert.equal(parseReceipt('nothing readable').items.length,0);
console.log('Passed: receipt items, totals exclusion, actual versus suggested tip, tax, comma decimals, and wrapped prices.');

const detailed=parseReceipt('2 Burger 15.00 30.00\nSalad x2 24.00\nSUBTOTAL 54.00\nNCA (3%) 1.62\nSales tax 5.40\nGratuity 18% 9.72\nKitchen support 2.00\nDiscount -3.00\nTOTAL 69.74');
assert.deepEqual(detailed.items.map(({name,price,quantity})=>({name,price,quantity})),[{name:'Burger',price:15,quantity:2},{name:'Salad',price:12,quantity:2}]);
assert.equal(detailed.tax,6.02);assert.equal(detailed.tip,9.72);
console.log('Passed: quantity and unit-price separation, extended amounts, NCA, generic bill charges, discounts, and percentage gratuity.');

for (const text of ['CHIP. PRAWNS & SCALLOPS 26.00 1 26.00','CHIP. PRAWNS & SCALLOPS 26.00 1']) {
 const item=parseReceipt(text).items[0];
 assert.equal(item.name,'CHIP. PRAWNS & SCALLOPS');assert.equal(item.price,26);assert.equal(item.quantity,1);
}
const multiple=parseReceipt('CHIP. PRAWNS & SCALLOPS 26.00 2 52.00').items[0];
assert.equal(multiple.name,'CHIP. PRAWNS & SCALLOPS');assert.equal(multiple.price,26);assert.equal(multiple.quantity,2);
const saved=normalizeItem({id:9,name:'CHIP. PRAWNS & SCALLOPS 26.00 1',price:26,quantity:1,people:[0,1]});
assert.equal(saved.name,'CHIP. PRAWNS & SCALLOPS');assert.deepEqual(saved.people,[0,1]);
assert.equal(normalizeItem(saved).name,saved.name);
assert.equal(normalizeItem({id:10,name:'Wings No. 5',price:12,quantity:1,people:[]}).name,'Wings No. 5');
console.log('Passed: trailing unit price and quantity are removed from scanned and saved item names, with quantities and assignments retained.');

const receiptHeader=(text)=>parseReceipt(text);
const header=receiptHeader('CUSTOMER COPY\nJUNIPER KITCHEN\n123 Main Street\nSan Francisco, CA 94107\n(415) 555-1212\nOpened 11/09/2026 7:45 PM\nPrinted 11/10/2026\nBurger 18.00\nSubtotal 18.00');
assert.equal(header.restaurant,'JUNIPER KITCHEN');assert.equal(header.mealDate,'2026-11-09');
for(const [printed,date] of [['Date: 11/09/26','2026-11-09'],['2026-11-09 19:45','2026-11-09'],['November 9, 2026','2026-11-09'],['9 Nov 2026','2026-11-09'],['Feb 29, 2024','2024-02-29']])assert.equal(receiptHeader(`Juniper\n${printed}\nSoup 10.00`).mealDate,date,printed);
for(const invalid of ['02/30/2026','02/29/2026','13/09/2026','11/09','Exp: 11/09/2026','Reservation date: 11/09/2026'])assert.equal(receiptHeader(`Juniper\n${invalid}\nSoup 10.00`).mealDate,null,invalid);
assert.equal(receiptHeader('THE\nCHEESECAKE FACTORY\nDate 11/09/26\nSoup 10.00').restaurant,'THE CHEESECAKE FACTORY');
assert.equal(receiptHeader('Welcome to Juniper!\nDate 11/09/26\nSoup 10.00').restaurant,'Juniper');
assert.equal(receiptHeader('Merchant: 7 Leaves Cafe\nSoup 10.00').restaurant,'7 Leaves Cafe');
assert.equal(receiptHeader('Soup 10.00\nSubtotal 10.00').restaurant,null);
assert.equal(receiptHeader('123 Main St\nCA 94107\n(415) 555-1212\nSoup 10.00').restaurant,null);
console.log('Passed: restaurant headers, U.S./ISO/written dates, calendar validation, date priority, expiration/reservation exclusions, address/phone filtering, and missing-field fallbacks.');

const realLayout=parseReceipt(`Harbor Fish House
31 Municipal Wharf
ITEM PRICE QTY AMOUNT
OYSTERS ON THE HALF SHELL
1/2 DOZ 21.00 1 21.00
BOWL OF CHOWDER 14.00 1 14.00
PRAWNS & SCALLOPS 76.00 1 26.00
CIOPPINO 30.00 1 30.00
CHARD 9.00 1 9.00
COKE 5.00 1 5.00
DIET COKE 5.00 1 5.00
PINOT GRIGIO 9.00 1 9.00
FISH TACOS 0.00 1 0.00
MAHI $25 25.00 1 25.00
LINGUINI & CLAMS 23.00 1 23.00
Sub-Total: $167.00
SALES TAX 9.75% 16.28
Total-TAX: $16.28
NCA: $6.41
TOTAL: $189.69
Date Time: 08-Nov-2026 01:52PM
Tip Amount $____
Total Amount $223.83
Suggested Tip 18.00% $34.14`);
assert.equal(realLayout.items.length,10);assert.equal(realLayout.items.reduce((s,i)=>s+i.price*i.quantity,0),167);assert.equal(realLayout.tax,22.69);assert.equal(realLayout.tip,34.14);assert.equal(realLayout.mealDate,'2026-11-08');assert.equal(realLayout.items[2].price,26);assert(realLayout.items[0].name.includes('OYSTERS'));assert.equal(realLayout.items[8].name,'FISH TACOS — MAHI');
assert(realLayout.warnings.some(w=>w.includes('disagree')));
const uncertain=parseReceipt('Cafe\nSoup 10.00\nSubtotal 10.00\nTax 1.00\nTotal 11.00\nTip Amount $____\nTotal Amount 12.49\nSuggested Tip 20% 2.00');assert.equal(uncertain.tip,0);assert(uncertain.warnings.some(w=>w.includes('unreadable')));
const mismatch=parseReceipt('Cafe\nSoup 10.00\nSubtotal 20.00\nTotal 20.00');assert(mismatch.warnings.some(w=>w.includes('subtotal')));
console.log('Passed: column amounts override misread unit prices, wrapped names/modifiers, duplicate tax summaries, NCA, hyphenated dates, conservative tip inference, and subtotal mismatch warnings.');
