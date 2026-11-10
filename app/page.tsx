'use client';
import { useState, useRef, useEffect } from 'react';
import { ArrowUpRight, Plus, Check, ChevronDown, Upload, ScanLine, ReceiptText, Users, ArrowRight, X, Copy, CheckCheck, Sparkles, History, Camera, Trash2, CalendarDays } from 'lucide-react';
import { getReceiptImage, saveReceiptImage, deleteReceiptImage } from '../lib/receipt-images';
import { scanReceipt } from '../lib/scan-receipt';
import { restoreBill, billTotal, updateHistory, groupBillsByDate, localMealDate, type Bill } from '../lib/bill-history';
import { parseReceipt } from '../lib/receipt';
import { PwaControls } from '../components/pwa-controls';
import { SwipeableItem } from '../components/swipeable-item';
import { AmountInput } from '../components/amount-input';
type Item={id:number;name:string;price:number;quantity:number;people:number[]};
const initial:Item[]=[{id:1,name:'Burrata & heirloom tomatoes',price:18,quantity:1,people:[0,1,2]},{id:2,name:'Spicy rigatoni',price:26,quantity:1,people:[0]},{id:3,name:'Wild mushroom pizza',price:24,quantity:1,people:[1,2]},{id:4,name:'Grilled branzino',price:34,quantity:1,people:[3]},{id:5,name:'Tiramisu',price:12,quantity:1,people:[0,1,2,3]},{id:6,name:'House red',price:14,quantity:2,people:[0,3]}];
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
export function allocate(total:number,weights:number[]){const sum=weights.reduce((a,b)=>a+b,0);if(!sum)return weights.map(()=>0);const sign=total<0?-1:1;total=Math.abs(total);const exact=weights.map(w=>total*w/sum),out=exact.map(Math.floor);let left=total-out.reduce((a,b)=>a+b,0);exact.map((v,i)=>({i,r:v-out[i]})).sort((a,b)=>b.r-a.r).slice(0,left).forEach(({i})=>out[i]++);return out.map(n=>n*sign);}
export default function Home(){
 const [billId,setBillId]=useState(''),[history,setHistory]=useState<Bill[]>([]),[saveError,setSaveError]=useState(false);
 const [scanWarnings,setScanWarnings]=useState<string[]>([]);
 const [mealDate,setMealDate]=useState('');
 const [createdAt,setCreatedAt]=useState(''),[deletedBill,setDeletedBill]=useState<Bill|null>(null),[shareDetails,setShareDetails]=useState(false);
 const [receiptZoom,setReceiptZoom]=useState(false),[receiptBillId,setReceiptBillId]=useState('');
 const [scanPreview,setScanPreview]=useState(''),[receiptRevision,setReceiptRevision]=useState(0),[sessionReceipt,setSessionReceipt]=useState<{id:string;image:Blob}|null>(null),[deletedReceipt,setDeletedReceipt]=useState<Blob|null>(null);
 const [expandedItem,setExpandedItem]=useState<number|null>(null);
 const [taxSplit,setTaxSplit]=useState<'proportional'|'equal'>('proportional'),[tipSplit,setTipSplit]=useState<'proportional'|'equal'>('proportional');
 const [tipRate,setTipRate]=useState<number|null>(null);
 const [tipAfterTax,setTipAfterTax]=useState(false);
 const [scanProgress,setScanProgress]=useState(''),[scanError,setScanError]=useState('');
 const [items,setItems]=useState(initial),[people,setPeople]=useState(['You','Alex','Jamie','Sam']),[tax,setTax]=useState(12.6),[tip,setTip]=useState(28.4),[restaurant,setRestaurant]=useState('A little dinner with friends'),[modal,setModal]=useState(''),[person,setPerson]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[receipt,setReceipt]=useState(''),[ready,setReady]=useState(false);const file=useRef<HTMLInputElement>(null);
 useEffect(()=>{let disposed=false,url='';setReceipt('');setReceiptBillId('');if(billId){getReceiptImage(billId).catch(()=>undefined).then(stored=>{const image=stored||(sessionReceipt?.id===billId?sessionReceipt.image:undefined);if(!disposed&&image){url=URL.createObjectURL(image);setReceipt(url);setReceiptBillId(billId)}})}return()=>{disposed=true;if(url)URL.revokeObjectURL(url)}},[billId,receiptRevision,sessionReceipt]);
 useEffect(()=>()=>{if(scanPreview)URL.revokeObjectURL(scanPreview)},[scanPreview]);
 function loadBill(bill: Bill) {
   setScanWarnings(bill.scanWarnings||[]);setExpandedItem(null);
   setBillId(bill.id);setMealDate(bill.mealDate);setCreatedAt(bill.createdAt);setItems(bill.items);setPeople(bill.people);setTax(bill.tax);setTip(bill.tip);
   setTaxSplit(bill.taxSplit||'proportional');setTipSplit(bill.tipSplit||'proportional');setTipRate(bill.tipRate);setTipAfterTax(bill.tipAfterTax);setRestaurant(bill.restaurant);
   setScanError('');
 }
 useEffect(()=>{
   try {
     const savedHistory=JSON.parse(localStorage.getItem('tabby-history')||'[]');
     setHistory(savedHistory.map((d: Bill)=>restoreBill(d,d.id||crypto.randomUUID())));
     const saved=localStorage.getItem('tabby-bill');
     if(saved)loadBill(restoreBill(JSON.parse(saved),crypto.randomUUID()));
     else {setMealDate(localMealDate());setBillId(crypto.randomUUID());setCreatedAt(new Date().toISOString())}
   }catch{setSaveError(true);setBillId(crypto.randomUUID())}
   setReady(true);
 },[]);
 useEffect(()=>{
   if(!ready||!billId)return;
   try {
     const bill:Bill={scanWarnings,id:billId,mealDate:mealDate||localMealDate(),createdAt:createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),items,people,tax,tip,taxSplit,tipSplit,tipRate,tipAfterTax,restaurant};
     const saved:Bill[]=JSON.parse(localStorage.getItem('tabby-history')||'[]');
     const updated=(saved.some(b=>b.id===billId)||items.some(i=>i.price>0))?updateHistory(saved,bill):saved;
     // Save history first so starting another bill never overwrites the only copy.
     localStorage.setItem('tabby-history',JSON.stringify(updated));
     localStorage.setItem('tabby-bill',JSON.stringify(bill));
     setHistory(updated);setSaveError(false);
   }catch{setSaveError(true)}
 },[billId,mealDate,createdAt,items,people,tax,tip,taxSplit,tipSplit,tipRate,tipAfterTax,restaurant,ready,scanWarnings]);
 function startNew(manual:boolean){
   if(saveError){toast('This browser could not save your current bill. Free up browser storage before starting a new split.');return}
   setScanWarnings([]);setMealDate(localMealDate());setBillId(crypto.randomUUID());setCreatedAt(new Date().toISOString());setItems(manual?[{id:Date.now(),name:'',price:0,quantity:1,people:[]}]:[]);
   setTaxSplit('proportional');setTipSplit('proportional');setExpandedItem(null);setPeople(['You']);setTax(0);setTip(0);setTipRate(null);setTipAfterTax(false);
   setRestaurant('');setScanError('');setModal('');
   if(!manual){file.current?.removeAttribute('capture');file.current?.click();}
 }

 const subtotal=items.reduce((s,i)=>s+Math.round(i.price*i.quantity*100),0),taxC=Math.round(tax*100),tipC=tipRate===null?Math.round(tip*100):Math.round((subtotal+(tipAfterTax?taxC:0))*tipRate/100),total=subtotal+taxC+tipC;
 const bases=people.map(()=>0);items.forEach(item=>{if(item.people.length){const shares=allocate(Math.round(item.price*item.quantity*100),item.people.map(()=>1));item.people.forEach((p,j)=>bases[p]+=shares[j]);}});const equalWeights=people.map((_,p)=>items.some(item=>item.people.includes(p))?1:0);const taxes=allocate(taxC,taxSplit==='equal'?equalWeights:bases),tips=allocate(tipC,tipSplit==='equal'?equalWeights:bases),unassigned=items.filter(i=>!i.people.length).length;
 const toggle=(id:number,p:number)=>setItems(items.map(i=>i.id===id?{...i,people:i.people.includes(p)?i.people.filter(x=>x!==p):[...i.people,p].sort()}:i));
 const toast=(s:string)=>{setNotice(s);setTimeout(()=>setNotice(''),4000)};
 async function scan(f?:File){
   if(!f || busy)return;
   if(!f.type.startsWith('image/')&&!/\.(jpe?g|png|webp|heic|heif)$/i.test(f.name)){toast('Please choose a receipt image.');return}
   setBusy(true);setScanError('');setScanProgress('Opening receipt…');setModal('scan');
   setScanPreview(URL.createObjectURL(f));
   try{
     const result=await scanReceipt(f,setScanProgress);
     const parsed=parseReceipt(result.text);
     if(result.restaurant)parsed.restaurant=result.restaurant;
     if(!parsed.items.length)throw new Error('No priced items could be read. Try a straight-on, well-lit photo with the full receipt visible.');
     const nextBillId=items.some(i=>i.price>0)?crypto.randomUUID():billId;
     let photoSaved=true;
     try{await saveReceiptImage(nextBillId,f)}catch{photoSaved=false}
     setSessionReceipt({id:nextBillId,image:f});setReceiptRevision(value=>value+1);
     if(nextBillId!==billId){setMealDate(parsed.mealDate||localMealDate());setBillId(nextBillId);setCreatedAt(new Date().toISOString())}else if(parsed.mealDate){setMealDate(parsed.mealDate)}
     setScanWarnings(parsed.warnings);setExpandedItem(null);setItems(parsed.items);setTax(parsed.tax);setTip(parsed.tip);setTipRate(null);setTipAfterTax(false);setRestaurant(parsed.restaurant||(nextBillId===billId?restaurant:''));setModal('');
     toast(photoSaved?'Receipt scanned. Review the restaurant, meal date, items, tax, and tip.':'Receipt scanned. You can view the photo now, but it could not be saved on this device.');
   }catch(e){
     console.error('Receipt scan failed:',e);
     setScanError(e instanceof Error?e.message:typeof e==='string'?e:'The receipt reader could not load. Refresh the page and try again.');
   }finally{setBusy(false)}
 }

 async function deletePastBill(id:string){
   try{
     const saved:Bill[]=JSON.parse(localStorage.getItem('tabby-history')||'[]');
     const target=saved.find(bill=>bill.id===id);if(!target)return;
     const photo=await getReceiptImage(id).catch(()=>undefined)||(sessionReceipt?.id===id?sessionReceipt.image:undefined);
     const remaining=saved.filter(bill=>bill.id!==id);
     localStorage.setItem('tabby-history',JSON.stringify(remaining));
     if(id===billId){
       const now=new Date().toISOString();
       const blank:Bill={id:crypto.randomUUID(),mealDate:localMealDate(),createdAt:now,updatedAt:now,items:[],people:['You'],tax:0,tip:0,tipRate:null,tipAfterTax:false,restaurant:''};
       localStorage.setItem('tabby-bill',JSON.stringify(blank));loadBill(blank);
     }
     await deleteReceiptImage(id).catch(()=>{});
     setDeletedReceipt(photo||null);setHistory(remaining);setDeletedBill(restoreBill(target,target.id));setSaveError(false);
   }catch{toast('This bill could not be deleted. Please try again.');setSaveError(true)}
 }
 async function undoDelete(){
   if(!deletedBill)return;
   try{
     const saved:Bill[]=JSON.parse(localStorage.getItem('tabby-history')||'[]');
     if(deletedReceipt)await saveReceiptImage(deletedBill.id,deletedReceipt);
     const restored=updateHistory(saved,deletedBill);
     localStorage.setItem('tabby-history',JSON.stringify(restored));setHistory(restored);setDeletedBill(null);setDeletedReceipt(null);
   }catch{toast('This bill could not be restored. Please try again.')}
 }
 const historyGroups=groupBillsByDate(history);
 const shareText=()=>`${restaurant.trim()||'Dinner with friends'}\n${people.map((p,i)=>`${p}: ${money(bases[i]+taxes[i]+tips[i])}${shareDetails?` (items ${money(bases[i])} + tax ${money(taxes[i])} + tip ${money(tips[i])})`:''}`).join('\n')}\nTotal: ${money(total)}`;

 return <div className="app receipt-app"><header><div className="brand-menu"><button className="brand" aria-label="Open past bills" aria-haspopup="dialog" onClick={()=>setModal('history')}><span className="brand-icon"><ReceiptText size={22}/></span>tabby<span className="brand-dot">.</span><ChevronDown className="brand-chevron" size={13}/></button></div><span className="header-caption">Good food. Fair shares.</span><div className="header-actions"><button className="quiet" onClick={()=>setModal('new')}>New split <Plus size={16}/></button></div></header>
 <main><PwaControls/>
 <div className="workspace"><section className="bill"><div className="receipt-masthead"><span className="receipt-wordmark">TABBY</span><h1><input className="receipt-restaurant-name" aria-label="Bill name" placeholder="Restaurant name" value={restaurant} onFocus={e=>{if(['Dinner with friends','Your scanned receipt'].includes(restaurant))e.currentTarget.select()}} onChange={e=>setRestaurant(e.target.value)}/></h1><label className="meal-date"><CalendarDays size={13}/><span>Meal date</span><input type="date" aria-label="Meal date" value={mealDate||localMealDate()} onChange={e=>setMealDate(e.target.value||localMealDate())}/></label><p>ONE TABLE · EVERYONE’S FAIR SHARE</p><span className={`receipt-save ${saveError?'save-error':''}`}><span/>{saveError?'Could not save on this device':'Saved on this device'}</span></div><div className="bill-head">{receipt&&receiptBillId===billId&&<button onClick={()=>{setReceiptZoom(false);setModal('view-receipt')}}><ReceiptText size={15}/> View receipt <ArrowUpRight size={13}/></button>}<button className="outline" onClick={()=>setModal('receipt-options')} disabled={busy}><ScanLine size={16}/> {busy?'Scanning…':'Scan receipt'}</button><input hidden type="file" accept="image/*" ref={file} onChange={e=>{scan(e.target.files?.[0]);e.target.value=''}}/></div>

 <div className="people-bar"><Users size={17}/><span>Who’s at the table?</span><div className="people-list">{people.map((p,i)=><button key={i} className={`person color-${i%6}`} onClick={()=>{setPerson(p);setModal(`person-${i}`)}}><span>{p[0]?.toUpperCase()}</span>{p}{i===0&&<small>you</small>}</button>)}<button className="add-person" onClick={()=>{setPerson('');setModal('person')}} aria-label="Add person"><Plus size={16}/></button></div></div>
 <div className="items-intro">{scanWarnings.length>0&&<div className="scan-review"><strong>Review the scan</strong><ul>{scanWarnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul><button onClick={()=>setScanWarnings([])}>Dismiss</button></div>}<h2>Items <span>{items.length} items</span></h2><p>Choose who had each item. Select all when the whole table shares.</p><p className="table-scroll-hint">Swipe the table for quantity, amount, and assignments →</p></div><div className="items-scroll"><div className="table-labels"><span>ITEM</span><span>UNIT PRICE</span><span>QTY</span><span>AMOUNT</span><span>WHO HAD IT?</span></div>
 <div className="item-list">{items.map((item,index)=><SwipeableItem key={item.id} name={item.name||'New item'} onRemove={()=>setItems(current=>current.filter(i=>i.id!==item.id))}><div className="item-name"><span className="item-number">{String(index+1).padStart(2,'0')}</span><input aria-label={`Item ${index+1} name`} placeholder="Item name" value={item.name} onFocus={e=>{if(item.name==='New item')e.currentTarget.select()}} onChange={e=>setItems(items.map(i=>i.id===item.id?{...i,name:e.target.value}:i))}/><button className={`assignment-toggle ${item.people.length?'has-people':''}`} aria-label={`Choose who pays for ${item.name||'New item'}`} aria-expanded={expandedItem===item.id} aria-controls={`assignment-${item.id}`} title={item.people.length?item.people.map(p=>people[p]).join(', '):'Assign people'} onClick={()=>setExpandedItem(current=>current===item.id?null:item.id)}>{item.people.length?<span className="assigned-initials">{item.people.map(p=><span key={p} className={`assigned-initial color-${p%6}`} title={people[p]} aria-label={people[p]}>{people[p]?.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()}</span>)}</span>:<><Users size={14}/><span>Assign</span></>}<ChevronDown size={11}/></button></div><div className="price-input"><span>$</span><AmountInput label={`${item.name||'New item'} price`} value={item.price} onCommit={price=>setItems(current=>current.map(i=>i.id===item.id?{...i,price}:i))}/></div><div className="quantity-input"><AmountInput label={`${item.name||'New item'} quantity`} quantity value={item.quantity} onCommit={quantity=>setItems(current=>current.map(i=>i.id===item.id?{...i,quantity}:i))}/></div><output className="line-amount" aria-label={`${item.name||'New item'} amount`}>{money(Math.round(item.price*item.quantity*100))}</output><div id={`assignment-${item.id}`} className={`assignments ${expandedItem===item.id?'expanded':''}`}><button className="select-all" aria-label={`${item.people.length===people.length?'Clear all':'Select all'} for ${item.name||'New item'}`} aria-pressed={item.people.length===people.length} onClick={()=>setItems(current=>current.map(i=>i.id===item.id?{...i,people:i.people.length===people.length?[]:people.map((_,index)=>index)}:i))}>{item.people.length===people.length?<><CheckCheck size={12}/> Clear all</>:<>Select all</>}</button>{people.map((p,i)=><button key={i} title={p} aria-label={`Assign ${item.name||'New item'} to ${p}`} aria-pressed={item.people.includes(i)} className={`assign color-${i%6} ${item.people.includes(i)?'selected':''}`} onClick={()=>toggle(item.id,i)}>{p[0]?.toUpperCase()}{item.people.includes(i)&&<Check size={9}/>}</button>)}<button className="delete-item" aria-label={`Remove ${item.name||'New item'}`} onClick={()=>setItems(items.filter(i=>i.id!==item.id))}><X size={13}/></button></div></SwipeableItem>)}</div>
 </div><button className="add-item" onClick={()=>setItems([...items,{id:Date.now(),name:'',price:0,quantity:1,people:[]}])}><Plus size={16}/> Add an item</button>
 <div className="items-subtotal"><div><strong>Subtotal</strong><span>Items only, before tax and tip</span></div><output aria-label="Items subtotal">{money(subtotal)}</output></div><div className="bill-bottom"><div className="extras-editor"><div className="extra-fields"><label>Tax <div><span>$</span><AmountInput currency label="Tax amount" value={tax} onCommit={setTax}/></div></label></div><div className="extra-fields tip-amount-row"><label>Tip <div><span>$</span><AmountInput currency label="Tip amount" value={tipC/100} onCommit={amount=>{setTip(amount);setTipRate(null)}}/></div></label></div><div className="tip-controls-label">Adjust tip</div><div className="tip-options" role="group" aria-label="Tip percentage">{[18,20,22].map(rate=><button key={rate} className={`tip-percent ${tipRate===rate?'chosen':''}`} aria-pressed={tipRate===rate} onClick={()=>setTipRate(rate)}>{rate}%</button>)}<label className="custom-tip"><AmountInput label="Custom tip percentage" value={tipRate??0} onCommit={setTipRate}/><span>%</span></label><button className={`tip-percent ${tipRate===null?'chosen':''}`} aria-pressed={tipRate===null} onClick={()=>{setTip(tipC/100);setTipRate(null)}}>$ Amount</button></div>{tipRate!==null&&<div className="tip-basis" role="group" aria-label="Calculate percentage tip"><span>Calculate tip</span><button className={`tip-percent ${!tipAfterTax?'chosen':''}`} aria-pressed={!tipAfterTax} onClick={()=>setTipAfterTax(false)}>Before tax</button><button className={`tip-percent ${tipAfterTax?'chosen':''}`} aria-pressed={tipAfterTax} onClick={()=>setTipAfterTax(true)}>After tax</button></div>}<details className="split-settings"><summary>Split settings</summary><p>Split extras proportionally to item costs, or equally among people assigned items.</p>{([{label:'Tax',value:taxSplit,set:setTaxSplit},{label:'Tip',value:tipSplit,set:setTipSplit}] as const).map(setting=><label key={setting.label}><span>{setting.label}</span><select aria-label={`${setting.label} split method`} value={setting.value} onChange={e=>setting.set(e.target.value as 'proportional'|'equal')}><option value="proportional">Proportional</option><option value="equal">Equal</option></select></label>)}</details><div className="receipt-total"><strong>Total</strong><output aria-label="Receipt total">{money(total)}</output></div><p className="tax-hint">Include any extra fees in Tax. You can type a sum, such as 8.50+2.</p><p className="calculation-hint">{tipRate===null?'Enter the tip you paid.':`Percentage of ${tipAfterTax?'items plus tax':'the pre-tax items subtotal'}.`} Use + − * / in any amount; press Enter to calculate.</p></div></div></section>
 <aside><div className="summary"><div className="summary-top"><span className="section-kicker">ALL SQUARED UP</span><span className="summary-icon"><ReceiptText size={18}/></span></div><h2>Each person pays<span>.</span></h2><p>Items, tax, and tip. All accounted for.</p><div className="summary-people">{people.map((p,i)=><div className="summary-person" key={i}><span className={`avatar color-${i%6}`}>{p[0]?.toUpperCase()}</span><div><strong>{p} {i===0&&<small>(you)</small>}</strong><span>{subtotal?(bases[i]/subtotal*100).toFixed(1):0}% of the table</span></div><b>{money(bases[i]+taxes[i]+tips[i])}</b></div>)}</div><div className="totals"><div><span>Items subtotal</span><span>{money(subtotal)}</span></div><div><span>Tax</span><span>{money(taxC)}</span></div><div><span>Tip <small>{tipRate??(subtotal?Math.round(tipC/subtotal*100):0)}%{tipRate!==null?(tipAfterTax?' after tax':' before tax'):''}</small></span><span>{money(tipC)}</span></div><div className="grand-total"><b>Table total</b><b>{money(total)}</b></div></div>{unassigned>0&&<div className="warning">Assign {unassigned} more {unassigned===1?'item':'items'} to complete your split.</div>}<button className="primary" disabled={unassigned>0||!subtotal} onClick={()=>setModal('summary')}>Settle up <ArrowRight size={17}/></button><div className="rounding"><CheckCheck size={14}/> Every cent accounted for</div></div></aside></div>
 <footer className="receipt-footer"><span>THANK YOU FOR SHARING</span><span>Good food. Fair shares. ♡</span></footer></main>
 {notice&&<div className="toast" role="status">{notice}<button onClick={()=>setNotice('')}><X size={15}/></button></div>}
 {modal&&<div className="modal-backdrop" onClick={()=>!busy&&setModal('')}><div className="modal" role="dialog" aria-modal="true" aria-label="Bill details" onClick={e=>e.stopPropagation()}>{!busy&&<button className="close" onClick={()=>setModal('')} aria-label="Close"><X size={20}/></button>}{modal.startsWith('person')?<><div className="modal-symbol"><Users/></div><h2>{modal==='person'?'Pull up a chair.':'Edit your guest.'}</h2><p>Give everyone at the table a name.</p><form onSubmit={e=>{e.preventDefault();if(!person.trim())return;if(modal==='person')setPeople([...people,person.trim()]);else setPeople(people.map((p,i)=>i===Number(modal.split('-')[1])?person.trim():p));setModal('')}}><input autoFocus className="text-field" placeholder="Name" value={person} onChange={e=>setPerson(e.target.value)} maxLength={22}/><button className="primary">{modal==='person'?'Add person':'Save name'}<ArrowRight size={16}/></button></form>{modal!=='person'&&people.length>1&&<button className="remove-person" onClick={()=>{const n=Number(modal.split('-')[1]);setPeople(people.filter((_,i)=>i!==n));setItems(items.map(i=>({...i,people:i.people.filter(p=>p!==n).map(p=>p>n?p-1:p)})));setModal('')}}>Remove person</button>}</>:modal==='summary'?<><div className="modal-symbol"><CheckCheck/></div><h2>Dinner, settled.</h2><p>{restaurant}</p>{people.map((p,i)=><div className="settle-row" key={i}><div><strong>{p}</strong><small>Items {money(bases[i])} · Tax {money(taxes[i])} · Tip {money(tips[i])}</small></div><b>{money(bases[i]+taxes[i]+tips[i])}</b></div>)}<div className="settle-total"><span>Table total</span><b>{money(total)}</b></div><fieldset className="share-options"><legend>Include in copied message</legend><label><input type="radio" name="share-format" checked={!shareDetails} onChange={()=>setShareDetails(false)}/> Totals only</label><label><input type="radio" name="share-format" checked={shareDetails} onChange={()=>setShareDetails(true)}/> Items + Tax + Tip</label></fieldset><button className="primary" onClick={async()=>{try{await navigator.clipboard.writeText(shareText());toast('Split copied. Ready for the group chat.')}catch{toast('Copy unavailable in this browser. Select the totals above.')}}}><Copy size={16}/> Copy split for the group</button></>:modal==='view-receipt'?<><div className="modal-symbol"><ReceiptText/></div><h2>Your original receipt.</h2><p>Compare the photo with your items, tax, and tip.</p><div className="receipt-image-viewer"><img style={{width:receiptZoom?'200%':'100%',maxWidth:'none'}} src={receipt} alt="Original uploaded receipt"/></div><button className="receipt-full-size" onClick={()=>setReceiptZoom(zoom=>!zoom)}>{receiptZoom?'Fit to screen':'Zoom in'} <ArrowUpRight size={14}/></button></>:modal==='receipt-options'?<><div className="modal-symbol"><ScanLine/></div><h2>Bring your bill.</h2><p>Take a clear photo of the full receipt or choose one you already have.</p><button className="primary" onClick={()=>{file.current?.setAttribute('capture','environment');file.current?.click()}}><Camera size={18}/> Take a photo</button><button className="outline full" onClick={()=>{file.current?.removeAttribute('capture');file.current?.click()}}><Upload size={17}/> Choose a photo</button></>:modal==='history'?<><div className="modal-symbol"><History/></div><h2>Past bills.</h2><p>Saved in this browser for this site and device. Clearing browser data removes them; bills do not sync across devices.</p>{deletedBill&&<div className="history-deleted" role="status"><span>Bill deleted.</span><button onClick={undoDelete}>Undo</button></div>}{history.length===0?<div className="history-empty">Your bills will appear here as you add items.</div>:<div className="history-list">{historyGroups.map(group=><section className="history-date-group" key={group.date} aria-label={`Meal date ${group.label}`}><h3>{group.label}</h3>{group.bills.map(bill=><SwipeableItem key={bill.id} name={bill.restaurant||'Dinner with friends'} rowId={bill.id} contentClassName="history-row" className="history-swipe" allowButtonSwipe removeLabel={`Delete saved bill ${bill.restaurant||'Dinner with friends'}`} onRemove={()=>deletePastBill(bill.id)}><button className="history-entry" disabled={busy} onClick={()=>{if(saveError){toast('Your current bill could not be saved.');return}loadBill(restoreBill(bill,bill.id));setModal('')}}><div><strong>{bill.restaurant||'Dinner with friends'}{bill.id===billId&&<small>Current</small>}</strong><span>{bill.people.length} {bill.people.length===1?'person':'people'} · {bill.items.length} items</span></div><b>{money(billTotal(bill))}</b><ArrowRight size={14}/></button><button className="history-delete" aria-label={`Delete bill ${bill.restaurant||'Dinner with friends'}`} onClick={()=>deletePastBill(bill.id)}><Trash2 size={16}/></button></SwipeableItem>)}</section>)}</div>}</>:modal==='new'?<><div className="modal-symbol"><ReceiptText/></div><h2>A fresh table.</h2><p>Your current bill stays in Past bills. Start fresh with just you, then add your new group.</p><button className="primary" onClick={()=>startNew(false)}><Upload size={17}/> Start with a receipt</button><button className="outline full" onClick={()=>startNew(true)}>Enter items manually</button></>:<><div className={`modal-symbol ${busy?'spinning':''}`}><ScanLine/></div><h2>{busy?'Reading the delicious details…':'Let’s try that again'}</h2><p role={scanError?'alert':'status'}>{busy?scanProgress:scanError}</p>{busy&&<p>Your photo is processed in your browser. The first scan may take a moment.</p>}{!busy&&<button className="primary" onClick={()=>file.current?.click()}><Upload size={16}/> Try another photo</button>}{scanPreview&&<img className="receipt-preview" src={scanPreview} alt="Uploaded receipt"/>}</>}</div></div>}
 </div>
}
