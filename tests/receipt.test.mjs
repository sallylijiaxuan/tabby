import assert from 'node:assert/strict';
import {parseReceipt} from '../lib/receipt.ts';
const result=parseReceipt('DINNER\nBurger $18.00\nSalad 12,00 T\nSUBTOTAL 30.00\nSALES TAX 3.00\nTIP 6.00\nTOTAL 39.00\nVISA 39.00\nSuggested tip 20% 7.80');
assert.deepEqual(result.items.map(({name,price})=>({name,price})),[{name:'Burger',price:18},{name:'Salad',price:12}]);
assert.equal(result.tax,3);assert.equal(result.tip,6);
assert.equal(parseReceipt('Pizza\n$24.00').items[0].name,'Pizza');
assert.equal(parseReceipt('nothing readable').items.length,0);
console.log('Passed: receipt items, totals exclusion, actual versus suggested tip, tax, comma decimals, and wrapped prices.');

const detailed=parseReceipt('2 Burger 15.00 30.00\nSalad x2 24.00\nSUBTOTAL 54.00\nNCA (3%) 1.62\nSales tax 5.40\nGratuity 18% 9.72\nKitchen support 2.00\nDiscount -3.00\nTOTAL 69.74');
assert.deepEqual(detailed.items.map(({name,price,quantity})=>({name,price,quantity})),[{name:'Burger',price:15,quantity:2},{name:'Salad',price:12,quantity:2}]);
assert.deepEqual(detailed.charges.map(({name,amount})=>({name,amount})),[{name:'NCA (3%)',amount:1.62},{name:'Kitchen support',amount:2},{name:'Discount',amount:-3}]);
assert.equal(detailed.tax,5.4);assert.equal(detailed.tip,9.72);
console.log('Passed: quantity and unit-price separation, extended amounts, NCA, generic bill charges, discounts, and percentage gratuity.');
