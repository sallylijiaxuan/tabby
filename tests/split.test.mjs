import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8');
const fn=source.match(/export function allocate\(total:number,weights:number\[\]\)\{(.+?)\}\n/)[1];
const allocate=new Function('total','weights',fn);
assert.deepEqual(allocate(2000,[6000,4000]),[1200,800]);
assert.deepEqual(allocate(100,[1,1,1]),[34,33,33]);
assert.deepEqual(allocate(0,[60,40]),[0,0]);
assert.deepEqual(allocate(201,[0,1]),[0,201]);
for(let total=0;total<10000;total+=37){const parts=allocate(total,[11,47,29,3]);assert.equal(parts.reduce((a,b)=>a+b,0),total);assert(parts.every(n=>Number.isInteger(n)&&n>=0));}
console.log('Passed: proportional tax/tip, shared-item rounding, zero amounts, and cent conservation.');
