import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../dist/client/',import.meta.url), files=[];
async function walk(directory,prefix=''){
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const path=prefix+entry.name;
  if(entry.name.startsWith('.'))continue;
  if(entry.isDirectory())await walk(new URL(entry.name+'/',directory),path+'/');
  else if(/\.(js|css|png|svg|wasm|traineddata|woff2?|webmanifest)$/.test(path)&&path!=='sw.js')files.push('/'+path);
 }
}
await walk(root);files.sort();
const hash=createHash('sha256');
for(const file of files){hash.update(file);hash.update(await readFile(new URL('.'+file,root)));}
const template=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
hash.update(template);
await writeFile(new URL('sw.js',root),template.replace('__CACHE_VERSION__',hash.digest('hex').slice(0,16)).replace('/* PRECACHE */ []',JSON.stringify(files)));
const headers=new URL('_headers',root);
const currentHeaders=await readFile(headers,'utf8');
if(!currentHeaders.includes('/sw.js'))await writeFile(headers,currentHeaders+'\n/sw.js\n  Cache-Control: no-cache\n/manifest.webmanifest\n  Cache-Control: no-cache\n');
console.log(`PWA: cached app shell plus ${files.length} assets, including offline receipt OCR.`);
