import {chromium,devices,expect} from '@playwright/test';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({...devices['iPhone 13']});const page=await context.newPage();
 await page.addInitScript(()=>{if(localStorage.getItem('split-seeded'))return;const bill={id:'split-test',restaurant:'Split test',people:['You','Alex','Unused'],items:[{id:1,name:'Dinner A',price:60,quantity:1,people:[0]},{id:2,name:'Dinner B',price:40,quantity:1,people:[1]}],tax:10.01,tip:20.01,tipRate:null,tipAfterTax:false};localStorage.setItem('tabby-bill',JSON.stringify(bill));localStorage.setItem('split-seeded','1')});
 await page.goto('http://127.0.0.1:5174');await expect(page.getByLabel('Bill name',{exact:true})).toHaveValue('Split test');
 const totals=page.locator('.summary-person>b');await expect(totals).toHaveText(['$78.02','$52.00','$0.00']);
 await page.getByText('Split settings',{exact:true}).click();
 await expect(page.getByLabel('Tax split method')).toHaveValue('proportional');
 await page.getByLabel('Tip split method').selectOption('equal');await expect(totals).toHaveText(['$76.02','$54.00','$0.00']);
 await page.getByLabel('Tax split method').selectOption('equal');await expect(totals).toHaveText(['$75.02','$55.00','$0.00']);
 await page.reload();await expect(page.getByLabel('Bill name',{exact:true})).toHaveValue('Split test');await page.getByText('Split settings',{exact:true}).click();await expect(page.getByLabel('Tip split method')).toHaveValue('equal');await expect(page.getByLabel('Tax split method')).toHaveValue('equal');await expect(totals).toHaveText(['$75.02','$55.00','$0.00']);
 await page.getByRole('button',{name:'Settle up',exact:false}).click();await expect(page.locator('.settle-row small')).toHaveText(['Items $60.00 · Tax $5.01 · Tip $10.01','Items $40.00 · Tax $5.00 · Tip $10.00','Items $0.00 · Tax $0.00 · Tip $0.00']);await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Open past bills',exact:true}).click();await expect(page.locator('.history-delete').first()).toBeHidden();await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'New split',exact:false}).click();await page.getByRole('button',{name:'Enter items manually',exact:true}).click();await page.getByText('Split settings',{exact:true}).click();await expect(page.getByLabel('Tax split method')).toHaveValue('proportional');await expect(page.getByLabel('Tip split method')).toHaveValue('proportional');
 console.log('Passed independent tax/tip allocation, cent rounding, excluded unassigned people, persistence, settlement breakdown, new bill defaults, and mobile history icon removal.');
}finally{await browser.close()}
