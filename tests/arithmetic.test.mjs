import assert from 'node:assert/strict';
import { calculateAmount } from '../lib/arithmetic.ts';
for (const [expression, expected] of [['6+5',11],['18*2+6/3',38],['(6+5)*2',22],['.5 + 1.25',1.75],['10-3',7],['1/3',.33],['0',0],['',0],['6×2',12],['12÷3',4],['-2+5',3]]) assert.equal(calculateAmount(expression),expected,expression);
for (const expression of ['6+', '1/0', '-5', 'alert(1)', '(6+5', '1..2', '2**3']) assert.throws(()=>calculateAmount(expression),undefined,expression);
console.log('Passed: arithmetic, operator precedence, parentheses, cent rounding, empty inputs, and invalid expressions.');
