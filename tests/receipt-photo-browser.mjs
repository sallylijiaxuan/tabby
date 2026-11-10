import {chromium,devices,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({...devices['iPhone 13']});const page=await context.newPage();await page.goto('http://127.0.0.1:5174');await page.waitForFunction(()=>!!localStorage.getItem('tabby-bill'));
 await page.getByRole('button',{name:'New split',exact:true}).click();await page.getByRole('button',{name:'Enter items manually'}).click();
 const restaurant=page.getByLabel('Bill name',{exact:true}),name=page.getByLabel('Item 1 name',{exact:true});
 await expect(restaurant).toHaveValue('');await expect(restaurant).toHaveAttribute('placeholder','Restaurant name');await expect(name).toHaveValue('');await expect(name).toHaveAttribute('placeholder','Item name');
 assert.equal(await name.evaluate(el=>getComputedStyle(el,'::placeholder').color),'rgb(162, 170, 153)');
 await restaurant.fill('Juniper');await name.fill('Soup');await expect(restaurant).toHaveValue('Juniper');await expect(name).toHaveValue('Soup');
 const price=page.getByLabel('Soup price',{exact:true});await price.fill('10');await price.press('Enter');
 assert.equal(await page.getByRole('button',{name:'View receipt',exact:true}).count(),0);
 assert(await page.locator('.swipe-row').first().evaluate(el=>getComputedStyle(el).backgroundColor===getComputedStyle(el.closest('.bill')).backgroundColor));
 await page.getByRole('button',{name:'Add an item',exact:true}).click();await expect(page.getByLabel('Item 2 name',{exact:true})).toHaveValue('');
 const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=900;c.height=750;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,900,750);ctx.fillStyle='black';ctx.font='32px monospace';['PHOTO TEST RESTAURANT','Burger             18.00','Salad              12.00','SUBTOTAL           30.00','TAX                 3.00','TIP                 6.00','TOTAL              39.00'].forEach((line,i)=>ctx.fillText(line,50,70+i*75));return c.toDataURL('image/png').split(',')[1]});
 await page.locator('input[type=file]').setInputFiles({name:'receipt.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});
 await expect(page.getByLabel('Burger price',{exact:true})).toHaveValue('18',{timeout:90000});await expect(restaurant).toHaveValue('PHOTO TEST RESTAURANT');await restaurant.fill('Luna');
 const id=await page.evaluate(()=>JSON.parse(localStorage.getItem('tabby-bill')).id);
 async function hasImage(id){return page.evaluate(id=>new Promise((resolve,reject)=>{const request=indexedDB.open('tabby-files',1);request.onsuccess=()=>{const db=request.result,read=db.transaction('receipts').objectStore('receipts').get(id);read.onsuccess=()=>{resolve(!!read.result);db.close()};read.onerror=()=>reject(read.error)};request.onerror=()=>reject(request.error)}),id)}
 async function view(){await page.getByRole('button',{name:'View receipt',exact:true}).click();const img=page.getByAltText('Original uploaded receipt',{exact:true});await expect.poll(()=>img.evaluate(el=>el.naturalWidth)).toBe(900);await page.getByRole('button',{name:'Zoom in',exact:true}).click();assert(await img.evaluate(el=>el.width>el.parentElement.clientWidth));await page.getByRole('button',{name:'Fit to screen',exact:true}).click();await page.getByRole('button',{name:'Close',exact:true}).click()}
 await view();assert(await hasImage(id));await page.reload();await expect(page.getByRole('button',{name:'View receipt',exact:true})).toBeVisible();await view();
 await page.getByRole('button',{name:'New split',exact:true}).click();await page.getByRole('button',{name:'Enter items manually'}).click();await expect(restaurant).toHaveValue('');assert.equal(await page.getByRole('button',{name:'View receipt',exact:true}).count(),0);
 await page.getByRole('button',{name:'Open past bills',exact:true}).click();await page.locator(`.history-row[data-bill-id="${id}"] .history-entry`).click();await expect(restaurant).toHaveValue('Luna');await view();
 await page.getByRole('button',{name:'Open past bills',exact:true}).click();await page.getByRole('button',{name:'Delete bill Luna',exact:true}).click();await expect(page.getByRole('button',{name:'Undo',exact:true})).toBeVisible();assert(!(await hasImage(id)));
 await page.getByRole('button',{name:'Undo',exact:true}).click();await page.locator(`.history-row[data-bill-id="${id}"] .history-entry`).click();assert(await hasImage(id));await view();
 await page.locator('input[type=file]').setInputFiles({name:'bad.png',mimeType:'image/png',buffer:Buffer.from('invalid image')});await expect(page.getByRole('alert')).toContainText('image format could not be opened',{timeout:90000});await page.getByRole('button',{name:'Close',exact:true}).click();await expect(restaurant).toHaveValue('Luna');await view();
 await page.getByRole('button',{name:'View receipt',exact:true}).click();await page.screenshot({path:'/private/tmp/tabby-saved-receipt-view.png',fullPage:false});await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.locator('.item').first().scrollIntoViewIfNeeded();await page.screenshot({path:'/private/tmp/tabby-closed-item-white.png',fullPage:false});
 console.log('Passed: real gray placeholders, white closed rows, uploaded receipt viewing and zoom, photo persistence after reload/history, correct photo deletion/Undo, and preserving the original photo after failed scans.');
}finally{await browser.close()}
