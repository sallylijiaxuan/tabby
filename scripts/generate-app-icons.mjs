import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ReceiptText} from 'lucide-react';
import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';

// Reuse the header's Lucide mark and colors for every app-icon size.
const mark=renderToStaticMarkup(React.createElement(ReceiptText,{size:320,color:'#f4f6e8',strokeWidth:2}));
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><path fill="#2f5941" d="M0 0h512v512H0z"/><g transform="translate(96 96)">${mark}</g></svg>`;
const directory=new URL('../public/icons/',import.meta.url);
await mkdir(directory,{recursive:true});
for(const [name,size] of [['icon-192.png',192],['icon-512.png',512],['apple-touch-icon.png',180],['maskable-512.png',512]]){
 await sharp(Buffer.from(svg)).resize(size,size).png().toFile(new URL(name,directory).pathname);
}
await writeFile(new URL('../public/favicon.svg',import.meta.url),svg);
console.log('Generated app icons using the Tabby header mark.');
