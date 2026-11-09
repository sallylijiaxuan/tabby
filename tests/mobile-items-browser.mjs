import {chromium,devices,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({...devices['iPhone 13']});
 const page=await context.newPage();await page.goto('http://127.0.0.1:5174');
 const name='Burrata & heirloom tomatoes';
 await expect(page.getByRole('button',{name:`Choose who pays for ${name}`,exact:true})).toBeVisible();
 for(const width of [320,375,390,430,844,980]){
  await page.setViewportSize({width,height:844});
  const measurements=await page.locator('.item').first().evaluate(el=>{
   const rect=el.getBoundingClientRect(),price=el.querySelector('.price-input').getBoundingClientRect(),qty=el.querySelector('.quantity-input').getBoundingClientRect(),total=el.querySelector('.line-amount').getBoundingClientRect();
   return {height:rect.height,tops:[price.top,qty.top,total.top],right:Math.max(price.right,qty.right,total.right),viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,tableOverflow:el.parentElement.parentElement.scrollWidth>el.parentElement.parentElement.clientWidth};
  });
  assert(!measurements.overflow&&!measurements.tableOverflow,`no sideways scrolling at ${width}`);
  assert(measurements.height<150,`compact two-row item at ${width}`);
  assert(Math.max(...measurements.tops)-Math.min(...measurements.tops)<1,`price/qty/total on same row at ${width}`);
  assert(measurements.right<=measurements.viewport,`all amounts visible at ${width}`);
 }
 await page.setViewportSize({width:390,height:844});
 const toggle=page.getByRole('button',{name:`Choose who pays for ${name}`,exact:true});await toggle.click();
 const sam=page.getByRole('button',{name:`Assign ${name} to Sam`,exact:true});await expect(sam).toBeVisible();await sam.click();await expect(sam).toHaveAttribute('aria-pressed','true');await toggle.click();await expect(sam).toBeHidden();
 await page.getByLabel(`${name} quantity`,{exact:true}).fill('2');await page.getByLabel(`${name} quantity`,{exact:true}).press('Enter');
 await expect(page.getByLabel(`${name} amount`,{exact:true})).toHaveText('$36.00');
 await toggle.scrollIntoViewIfNeeded();await page.screenshot({path:'/private/tmp/tabby-two-row-mobile.png',fullPage:false});
 await context.close();
 const laptop=await browser.newPage({viewport:{width:1440,height:1000}});await laptop.goto('http://127.0.0.1:5174');
 await expect(laptop.locator('.table-labels')).toBeVisible();await expect(laptop.getByRole('button',{name:`Choose who pays for ${name}`,exact:true})).toBeHidden();
 await expect(laptop.getByRole('button',{name:`Assign ${name} to You`,exact:true})).toBeVisible();
 const row=await laptop.locator('.item').first().evaluate(el=>[...el.children].map(c=>c.getBoundingClientRect().top));assert(Math.max(...row)-Math.min(...row)<12,'laptop retains one-row table');
 await laptop.screenshot({path:'/private/tmp/tabby-table-laptop.png',fullPage:false});
 console.log('Passed: compact mobile rows at 320–980px, all prices/quantities/totals visible, collapsible assignments, quantity editing, and separate laptop table.');
}finally{await browser.close()}
