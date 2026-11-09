import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();
 const directory=new URL('../public/icons/',import.meta.url);await mkdir(directory,{recursive:true});
 for(const [name,size] of [['icon-192.png',192],['icon-512.png',512],['apple-touch-icon.png',180],['maskable-512.png',512]]){
  const data=await page.evaluate(size=>{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
   const ctx=canvas.getContext('2d');ctx.scale(size/512,size/512);
   ctx.fillStyle='#335b3f';ctx.fillRect(0,0,512,512);
   ctx.lineWidth=13;ctx.strokeStyle='#f9faf0';ctx.lineJoin='round';ctx.lineCap='round';
   ctx.beginPath();ctx.moveTo(170,145);ctx.lineTo(342,145);ctx.lineTo(342,369);
   for(let i=0;i<8;i++)ctx.lineTo(342-(i+1)*21.5,i%2===0?353:369);
   ctx.lineTo(170,145);ctx.stroke();
   for(const [y,length] of [[196,108],[241,108],[286,72]]){ctx.beginPath();ctx.moveTo(202,y);ctx.lineTo(202+length,y);ctx.stroke();}
   return canvas.toDataURL('image/png').split(',')[1];
  },size);
  await writeFile(new URL(name,directory),Buffer.from(data,'base64'));
 }
 console.log('Generated Tabby home-screen icons.');
}finally{await browser.close()}
