import {chromium,devices,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({...devices['iPhone 13']});const page=await context.newPage();await page.goto('http://127.0.0.1:5174');await page.waitForFunction(()=>!!localStorage.getItem('tabby-bill'));
 await page.getByRole('button',{name:'Open Tabby menu',exact:true}).click();
 await expect(page.getByRole('button',{name:'New split',exact:true})).toHaveCount(1);
 assert.equal(await page.locator('.app-menu').getByRole('button',{name:'New split',exact:true}).count(),0);await page.keyboard.press('Escape');
 assert.equal(await page.locator('.fair-note').count(),0);assert.equal(await page.getByRole('button',{name:'Try the example bill',exact:true}).count(),0);
 await page.getByRole('button',{name:'20%',exact:true}).click();
 const order=await page.locator('.extras-editor').evaluate(el=>['.extra-fields','.tip-controls-label','.tip-options','.tip-basis','.tip-amount-row','.receipt-total'].map(selector=>el.querySelector(selector).getBoundingClientRect().top));
 assert(order.every((top,index)=>index===0||top>order[index-1]),'tax → adjust tip → percentage → calculate tip → tip amount → total');
 // Use actual browser touch events, not a JavaScript-only handler invocation.
 const client=await context.newCDPSession(page);
 const amount=page.getByLabel('Burrata & heirloom tomatoes amount',{exact:true});await amount.scrollIntoViewIfNeeded();
 const box=await amount.boundingBox();const x=box.x+box.width*.8,y=box.y+box.height*.7;
 async function swipe(from,to,atY){await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from,y:atY}]});for(let i=1;i<=8;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from+(to-from)*i/8,y:atY}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
 await swipe(x,x-150,y);
 const remove=page.getByRole('button',{name:'Delete Burrata & heirloom tomatoes',exact:true});await expect(remove).toBeVisible();await expect(amount).toHaveCount(1);
 await page.screenshot({path:'/private/tmp/tabby-swipe-delete.png',fullPage:false});
 await swipe(x-100,x,y);await expect(remove).toBeHidden();
 await swipe(x,x-150,y);await remove.click();await expect(amount).toHaveCount(0);await expect(page.getByLabel('Items subtotal',{exact:true})).toHaveText('$124.00');
 await expect(page.getByLabel('Tip amount',{exact:true})).toHaveValue('24.80');await expect(page.getByLabel('Receipt total',{exact:true})).toHaveText('$161.40');
 await page.reload();await expect(page.getByLabel('Items subtotal',{exact:true})).toHaveText('$124.00');
 const price=page.getByLabel('Spicy rigatoni price',{exact:true});await price.fill('6+5');await price.press('Enter');await expect(price).toHaveValue('11');
 await context.close();
 const desktop=await browser.newPage({viewport:{width:1440,height:1000}});await desktop.goto('http://127.0.0.1:5174');await desktop.waitForFunction(()=>!!localStorage.getItem('tabby-bill'));await expect(desktop.locator('.table-labels')).toBeVisible();await expect(desktop.locator('.swipe-delete').first()).toBeHidden();await desktop.getByRole('button',{name:'Remove Spicy rigatoni',exact:true}).click();await expect(desktop.getByLabel('Spicy rigatoni price',{exact:true})).toHaveCount(0);
 console.log('Passed: New split only in header, tip control order, removed extras section, real swipe-left reveal/right-close/delete, recalculated totals, persistence, editing, and laptop removal.');
}finally{await browser.close()}
