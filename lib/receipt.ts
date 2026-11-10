export type ReceiptItem = { id: number; name: string; price: number; quantity: number; people: number[] };
export type Charge = { id: number; name: string; amount: number };
export const isBillCharge = (name: string) => /\bn\.?c\.?a\.?\b|non[- ]?cash|surcharge|service\s*(charge|fee)|\bfee\b|adjustment|discount|delivery charge|rounding/i.test(name);

/** Older saved receipts stored the entire row amount in price. */
export function normalizeItem(item: Omit<ReceiptItem, 'quantity'> & { quantity?: number }): ReceiptItem {
  // Some receipts order columns as description, unit price, quantity, amount.
  // Clean these labels even when a previously saved row already has quantity=1.
  const trailing = item.name.match(/^(.*?)\s+\$?(\d+[.,]\d{2})\s+(\d+)\s*$/);
  if (trailing && /[a-z]/i.test(trailing[1]) && Number(trailing[3]) > 0) {
    return { ...item, name: trailing[1].trim(), price: Number(trailing[2].replace(',', '.')), quantity: Number(trailing[3]) };
  }
  if (Number.isInteger(item.quantity) && item.quantity! > 0) return { ...item, quantity: item.quantity! };
  const match = item.name.match(/^(\d+)\s*(?:[x×]\s*|\s+)(.+)$/i);
  const quantity = match && Number(match[1]) > 0 ? Number(match[1]) : 1;
  return { ...item, name: match ? match[2] : item.name, quantity, price: item.price / quantity };
}

/** Receipt dates use U.S. month/day order unless the year is first. */
function calendarDate(year:number,month:number,day:number):string|null {
  if(year<100)year+=year<70?2000:1900;
  if(year<1900||year>2099||month<1||month>12||day<1||day>31)return null;
  const date=new Date(Date.UTC(year,month-1,day));
  if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return null;
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function dateInLine(line:string):string|null {
  const iso=line.match(/\b((?:19|20)\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if(iso)return calendarDate(+iso[1],+iso[2],+iso[3]);
  const american=line.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/);
  if(american)return calendarDate(+american[3],+american[1],+american[2]);
  const namedDate=line.replace(/(\d)[- ]+([A-Za-z]{3,9})[- ]+(\d{2,4})/g,'$1 $2 $3');
  const months='Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?';
  const monthFirst=namedDate.match(new RegExp(`\\b(${months})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?[,]?\\s+(\\d{4}|\\d{2})\\b`,'i'));
  const dayFirst=namedDate.match(new RegExp(`\\b(\\d{1,2})\\s+(${months})\\.?[,]?\\s+(\\d{4}|\\d{2})\\b`,'i'));
  const monthNames=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  if(monthFirst)return calendarDate(+monthFirst[3],monthNames.indexOf(monthFirst[1].slice(0,3).toLowerCase())+1,+monthFirst[2]);
  if(dayFirst)return calendarDate(+dayFirst[3],monthNames.indexOf(dayFirst[2].slice(0,3).toLowerCase())+1,+dayFirst[1]);
  return null;
}

export function parseReceiptHeader(text:string):{restaurant:string|null;mealDate:string|null}{
  const lines=text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  let mealDate:string|null=null,bestDateScore=-Infinity;
  lines.forEach((line,index)=>{
    if(/expir|expires|\bexp\.?\s*(?:date)?\b|valid\s*(?:thru|through)|reserv|birthday|founded|copyright/i.test(line))return;
    const date=dateInLine(line);if(!date)return;
    const score=(/\b(?:date|sale|order|transaction|opened)\b/i.test(line)?20:0)+(/printed|reprint/i.test(line)?-10:0)+(index<20?5:0)-index/100;
    if(score>bestDateScore){mealDate=date;bestDateScore=score}
  });
  const firstItem=lines.findIndex(line=>/\S\s+\$?\d+[.,]\d{2}(?:\s+\d+)?(?:\s+[A-Z*])?$/i.test(line));
  const header=lines.slice(0,Math.min(firstItem<0?12:firstItem,16));
  let restaurant:string|null=null,bestNameScore=-Infinity;
  header.forEach((line,index)=>{
    let name=line.replace(/^[*#_=~|•\s]+|[*#_=~|•\s]+$/g,'').trim();
    const explicit=name.match(/^(?:restaurant|merchant|business|store)\s*:\s*(.+)$/i);
    const welcome=name.match(/^welcome\s+to\s+(.+?)[!*]*$/i);
    if(explicit)name=explicit[1].trim();else if(welcome)name=welcome[1].trim();
    if(name.length<3||name.length>90||(name.match(/[a-z]/gi)||[]).length<3)return;
    if((name.match(/[a-z0-9]/gi)||[]).length/name.replace(/\s/g,'').length<.7)return;
    if(/^(?:the|at|and|breakfast|brunch|lunch|dinner|restaurant|bar|cafe|square|toast|clover|welcome|dining room)$/i.test(name))return;
    if(/^(?:thank\s*you|customer\b|merchant\s+copy|guest\s+(?:check|receipt)|receipt\b|tax\s+invoice|check\b|order\b|table\b|server\b|cashier\b|date\b|time\b|ticket\b|transaction\b|terminal\b|station\b|dine[- ]?in\b|take[- ]?out\b|to[- ]?go\b|party\b|guests\b|sales?\b|invoice\b|subtotal\b|total\b|tip\b|tax\b|amount\b|item\b|qty\b|quantity\b|price\b|description\b|seat\b|suite\b|ste\b|unit\b|floor\b|tel\b|phone\b|address\b|printed\s+by|powered\s+by|processed\s+by)/i.test(name))return;
    if(/^\d+\s+.*\b(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|hwy|highway|pl|place)\b/i.test(name))return;
    if(/\b[A-Z]{2}\s*\d{5}(?:-\d{4})?\b/i.test(name)||/\(?\d{3}\)?[-.\s]+\d{3}[-.\s]+\d{4}\b/.test(name))return;
    if(/https?:|www\.|\.com\b|\.net\b|\.org\b|@\S+\.|\b\d{1,2}:\d{2}\b|[*x]{3,}/i.test(name)||dateInLine(name))return;
    if(index>0&&/^the$/i.test(header[index-1]))name=`${header[index-1]} ${name}`;
    const score=(explicit?30:welcome?20:10)-(/^[A-Z]{3,4}$/.test(name)?4:0)-index/100;
    if(score>bestNameScore){restaurant=name;bestNameScore=score}
  });
  return {restaurant,mealDate};
}

export function parseReceipt(text: string) {
  const items: ReceiptItem[]=[],warnings:string[]=[];
  let taxParts=0,taxSummary:number|null=null,fees=0,tipC=0,explicitTip=false,blankTip=false;
  let printedSubtotal:number|null=null,printedTotal:number|null=null,finalTotal:number|null=null;
  let afterSubtotal=false,inItems=false,pending='',suggestions=false;
  const suggested:number[]=[];
  const lines=text.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  const money=(line:string)=>[...line.matchAll(/-?\d+[.,]\d{2}(?!\d)/g)];
  for(let index=0;index<lines.length;index++){
    const line=lines[index],values=money(line),last=values.at(-1),amount=last?Math.round(Number(last[0].replace(',','.'))*100):null;
    if(/suggest|recommend|[gcq]uggested/i.test(line)){suggestions=true;if(amount!==null)suggested.push(amount);continue}
    if(suggestions){if(amount!==null)suggested.push(amount);continue}
    if(/^sub[- ]?total\b/i.test(line)){printedSubtotal=amount;afterSubtotal=true;pending='';continue}
    if(/\btotal[-\s]*tax\b|\btax[-\s]*total\b/i.test(line)){if(amount!==null)taxSummary=amount;afterSubtotal=true;continue}
    if(/\btax\b/i.test(line)){if(amount!==null)taxParts+=amount;afterSubtotal=true;continue}
    if(/\btip\b|gratuity/i.test(line)){if(amount!==null){tipC+=amount;explicitTip=true}else blankTip=true;continue}
    if(isBillCharge(line)){if(amount!==null)fees+=amount;continue}
    if(/^total\s+\w+/i.test(line)){if(amount!==null)finalTotal=amount;continue}
    if(/^(?:grand[- ]?)?total\s*[:$§|\d]/i.test(line)){if(amount!==null&&printedTotal===null)printedTotal=amount;afterSubtotal=true;continue}
    if(/charge\s+a|balance|change|visa|mastercard|payment|tender|credit|debit|card|auth\b|transaction|server\b|receipt#|node\b|date\b|time\b|expir|\bexp\b|reserv/i.test(line))continue;
    if(/\b(?:item|description)\b.*\b(?:price|qty|amount)\b/i.test(line)){inItems=true;pending='';continue}
    if(afterSubtotal){if(amount!==null&&!/%/.test(line)&&!/^\d/.test(line))fees+=amount;continue}
    if(amount===null){if(inItems&&/[a-z]/i.test(line)&&!/^[-_=]+$/.test(line))pending=line.replace(/\s+[0O][.,][0O]{2}.*$/,'').trim();continue}
    let name='',quantity=1,total=amount;
    // Explicit amount wins if OCR disagrees with unit price: never multiply twice.
    const columns=line.match(/^(.*?)\s+\$?(-?\d+[.,]\d{2})\s*(\d{1,3})\s+\$?(-?\d+[.,]\d{2})\s*(?:[A-Z*])?$/i);
    if(columns){name=columns[1];quantity=+columns[3]||1;total=Math.round(Number(columns[4].replace(',','.'))*100);const unit=Number(columns[2].replace(',','.'));if(Math.abs(Math.round(unit*quantity*100)-total)>1)warnings.push(`${name.trim()}: the price and line amount disagree. Check this item.`)}
    else{
      const noAmount=line.match(/^(.*?)\s+\$?(\d+[.,]\d{2})\s+(\d+)\s*$/);
      if(noAmount){name=noAmount[1];quantity=+noAmount[3]||1;total=Math.round(Number(noAmount[2].replace(',','.'))*quantity*100)}
      else{
        name=line.slice(0,last!.index).trim().replace(/[$§|]+\s*$/,'').trim();
        const unit=name.match(/^(.*?)\s+@?\$?(\d+[.,]\d{2})$/);if(unit)name=unit[1].trim();
        const suffix=name.match(/^(.*?)\s+[x×]\s*(\d+)$/i)??(unit?name.match(/^(.*?)\s+(\d+)$/):null);
        if(suffix){name=suffix[1];quantity=+suffix[2]||1}
        const leading=name.match(/^(\d+)\s*(?:[x×]\s*|\s+)(.+)$/i);if(leading){quantity=+leading[1]||1;name=leading[2]}
      }
    }
    name=name.trim().replace(/\s+[-–—]\s*$/,'');
    if(!name)name=pending||lines[index-1]||'';
    if(pending&&name!==pending&&(/^(?:\d+(?:\/\d+)?\s*(?:doz|dol|dozen|oz|lb|pcs)|small|large|regular)\b/i.test(name)||/\$\s*\d/.test(name)))name=`${pending} — ${name}`;
    const previous=items.at(-1);
    if(previous&&previous.price===0&&/\$\s*\d/.test(name)){previous.name+=` — ${name.replace(/\s*\$\s*\d+(?:[.,]\d{2})?/g,'').trim()}`;previous.price=total/100/quantity;previous.quantity=quantity;pending='';continue}
    if(!/[a-z]/i.test(name)||total<0)continue;
    items.push({id:items.length+1,name:name.replace(/\s*\$\s*\d+(?:[.,]\d{2})?/g,'').trim(),price:total/100/quantity,quantity,people:[]});pending='';inItems=true;
  }
  const taxC=(taxSummary??taxParts)+fees,subtotal=items.reduce((sum,item)=>sum+Math.round(item.price*item.quantity*100),0);
  if(printedSubtotal!==null&&Math.abs(printedSubtotal-subtotal)>1)warnings.push(`Items add up to $${(subtotal/100).toFixed(2)}, but the receipt subtotal is $${(printedSubtotal/100).toFixed(2)}. Review missing or misread items.`);
  if(!explicitTip&&finalTotal!==null){const difference=finalTotal-subtotal-taxC;if(difference>=0&&difference<=subtotal*.6&&suggested.includes(difference)){tipC=difference;warnings.push('Tip calculated from the final total. Verify it against the photo.')}}
  if(!explicitTip&&tipC===0&&blankTip)warnings.push('The paid tip is blank or unreadable. Enter what you paid; suggested tips are not added automatically.');
  if(printedTotal!==null&&Math.min(Math.abs(printedTotal-subtotal-taxC),Math.abs(printedTotal-subtotal-taxC-tipC))>2)warnings.push('The scanned amounts do not match the printed total. Check the receipt photo.');
  return {...parseReceiptHeader(text),items,tax:taxC/100,tip:tipC/100,printedSubtotal:printedSubtotal===null?null:printedSubtotal/100,printedTotal:printedTotal===null?null:printedTotal/100,warnings};
}
