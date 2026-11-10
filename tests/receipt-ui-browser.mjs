import {chromium,devices,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({...devices['iPhone 13']});const page=await context.newPage();await page.goto('http://127.0.0.1:5174');
 const logo=page.getByRole('button',{name:'Open Tabby menu',exact:true});
 await expect(logo).toBeVisible();
 await page.waitForFunction(()=>!!localStorage.getItem('tabby-bill'));
 assert.equal(await page.getByRole('button',{name:'Past bills',exact:true}).count(),0);
 assert.equal(await page.locator('.steps').count(),0);
 await logo.click();await expect(page.getByRole('navigation',{name:'Tabby menu'})).toBeVisible();await page.keyboard.press('Escape');await expect(logo).toHaveAttribute('aria-expanded','false');
 await logo.click();await page.mouse.click(375,400);await expect(logo).toHaveAttribute('aria-expanded','false');
 await logo.click();await page.getByRole('button',{name:'Past bills',exact:true}).click();await expect(page.locator('.history-entry')).toHaveCount(1);await page.getByRole('button',{name:'Close',exact:true}).click();
 const itemName='Burrata & heirloom tomatoes';const row=page.locator('.item').first();
 await page.getByRole('button',{name:`Choose who pays for ${itemName}`,exact:true}).click();
 await row.getByRole('button',{name:`Select all for ${itemName}`,exact:true}).click();
 await expect(row.locator('.assign[aria-pressed=true]')).toHaveCount(4);
 await row.getByRole('button',{name:`Clear all for ${itemName}`,exact:true}).click();await expect(row.locator('.assign[aria-pressed=true]')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Settle up',exact:true})).toBeDisabled();
 await row.getByRole('button',{name:`Select all for ${itemName}`,exact:true}).click();
 await row.getByRole('button',{name:`Assign ${itemName} to Alex`,exact:true}).click();await expect(row.locator('.assign[aria-pressed=true]')).toHaveCount(3);
 await page.getByRole('button',{name:'Add person',exact:true}).click();await page.getByPlaceholder('Name',{exact:true}).fill('Taylor');await page.getByRole('button',{name:'Add person',exact:true}).last().click();
 await row.getByRole('button',{name:`Select all for ${itemName}`,exact:true}).click();await expect(row.locator('.assign[aria-pressed=true]')).toHaveCount(5);
 await page.getByRole('button',{name:`Choose who pays for ${itemName}`,exact:true}).click();
 const tax=page.getByLabel('Tax amount',{exact:true});await tax.fill('10+2.50');await tax.press('Enter');
 await page.getByRole('button',{name:'20%',exact:true}).click();await page.getByRole('button',{name:'After tax',exact:true}).click();
 await expect(page.getByLabel('Receipt total',{exact:true})).toHaveText('$185.40');
 async function alignment(){
  const positions=await page.locator('.extra-fields').evaluate(el=>{const labels=[...el.querySelectorAll(':scope > label')];return labels.map(label=>{const input=label.querySelector('input'),rect=input.getBoundingClientRect();return {left:label.getBoundingClientRect().left,right:rect.right,top:rect.top,align:getComputedStyle(input).textAlign}})});
  assert(Math.abs(positions[0].left-positions[1].left)<1);assert(Math.abs(positions[0].right-positions[1].right)<1);assert(positions[0].top<positions[1].top);assert(positions.every(p=>p.align==='right'));
 }
 for(const width of [320,390,844,980]){await page.setViewportSize({width,height:844});await alignment();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await page.locator('.items-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth));}
 await page.setViewportSize({width:390,height:844});await page.getByLabel('Items subtotal',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:'/private/tmp/tabby-receipt-totals-mobile.png',fullPage:false});
 await page.locator('.receipt-masthead').scrollIntoViewIfNeeded();await page.screenshot({path:'/private/tmp/tabby-receipt-top-mobile.png',fullPage:false});
 await context.close();
 const desktop=await browser.newPage({viewport:{width:1440,height:1100}});await desktop.goto('http://127.0.0.1:5174');await expect(desktop.locator('.table-labels')).toBeVisible();await desktop.waitForFunction(()=>!!localStorage.getItem('tabby-bill'));assert.equal(await desktop.getByRole('button',{name:'Past bills',exact:true}).count(),0);
 await desktop.locator('.item').first().getByRole('button',{name:`Select all for ${itemName}`,exact:true}).click();await expect(desktop.locator('.item').first().locator('.assign[aria-pressed=true]')).toHaveCount(4);
 await desktop.screenshot({path:'/private/tmp/tabby-receipt-laptop.png',fullPage:false});
 console.log('Passed: logo menu, hidden main-screen history, Escape/outside dismissal, no steps, Select all/Clear all, guest-list changes, receipt total, tax/tip alignment, phone layouts, and laptop table.');
}finally{await browser.close()}
