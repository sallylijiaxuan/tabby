import assert from 'node:assert/strict';
import {parseReceipt} from '../lib/receipt.ts';
const result=parseReceipt('DINNER\nBurger $18.00\nSalad 12,00 T\nSUBTOTAL 30.00\nSALES TAX 3.00\nTIP 6.00\nTOTAL 39.00\nVISA 39.00\nSuggested tip 20% 7.80');
assert.deepEqual(result.items.map(({name,price})=>({name,price})),[{name:'Burger',price:18},{name:'Salad',price:12}]);
assert.equal(result.tax,3);assert.equal(result.tip,6);
assert.equal(parseReceipt('Pizza\n$24.00').items[0].name,'Pizza');
assert.equal(parseReceipt('nothing readable').items.length,0);
console.log('Passed: receipt items, totals exclusion, actual versus suggested tip, tax, comma decimals, and wrapped prices.');
