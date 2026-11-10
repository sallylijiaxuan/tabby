import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
 const page = await browser.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.goto('http://127.0.0.1:5174');
 await page.getByRole('button',{name:'Scan receipt',exact:true}).waitFor();
 await page.waitForFunction(()=>{const input=document.querySelector('input[type=file]');return input&&Object.keys(input).some(key=>key.startsWith('__reactProps')&&typeof input[key]?.onChange==='function')});
 const image=await page.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=900;canvas.height=750;
   const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,900,750);
   ctx.fillStyle='black';ctx.font='32px monospace';
   ['TABBY TEST RESTAURANT','Burger             18.00','Salad              12.00','SUBTOTAL           30.00','TAX                 3.00','TIP                 6.00','TOTAL              39.00'].forEach((line,i)=>ctx.fillText(line,50,70+i*75));
   return canvas.toDataURL('image/png').split(',')[1];
 });
 await page.locator('input[type=file]').setInputFiles({name:'receipt.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});
 await page.getByRole('status').filter({hasText:'Receipt scanned.'}).waitFor({timeout:90000});
 assert.equal(await page.getByLabel('Burger price',{exact:true}).inputValue(),'18');
 assert.equal(await page.getByLabel('Salad price',{exact:true}).inputValue(),'12');
 assert.equal(await page.getByLabel('Tax amount',{exact:true}).inputValue(),'3.00');
 assert.equal(await page.getByLabel('Tip amount',{exact:true}).inputValue(),'6.00');
 assert.deepEqual(errors,[]);
 // A failed scan preserves the existing bill and offers a retry.
 await page.locator('input[type=file]').setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('not an image')});
 await page.getByRole('alert').filter({hasText:'image format could not be opened'}).waitFor({timeout:90000});
 await page.getByRole('button',{name:'Try another photo'}).waitFor();
 assert.equal(await page.getByLabel('Burger price',{exact:true}).inputValue(),'18');
 console.log('Passed: Chrome receipt OCR with external requests blocked; items, tax, tip, no script errors, and failed-scan recovery.');
} finally {await browser.close();}
