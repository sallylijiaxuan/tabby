import { parseReceipt, parseReceiptHeader } from './receipt';
import { cleanReceiptImage } from './receipt-image-cleanup';
import type { Worker } from 'tesseract.js';

export async function scanReceipt(file: File, onProgress: (message: string) => void) {
  let stage='Reading receipt';
  let worker: Worker | undefined;
  let finished = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const operation = async () => {
    onProgress('Loading the receipt reader…');
    const { createWorker } = await import('tesseract.js');
    const base = new URL('/ocr/', window.location.origin).href;
    const created = await createWorker('eng', 1, {
      workerPath: `${base}worker.min.js`,
      corePath: base,
      langPath: base,
      workerBlobURL: false,
      gzip: false,
      cacheMethod: 'none',
      logger: message => {
        if (finished) return;
        onProgress(message.status === 'recognizing text'
          ? `${stage}… ${Math.round(message.progress * 100)}%`
          : 'Preparing the receipt reader…');
      },
    });
    if (finished) { await created.terminate(); throw new Error('Scan timed out.'); }
    worker = created;
    await worker.setParameters({tessedit_pageseg_mode:'6' as import('tesseract.js').PSM,preserve_interword_spaces:'1'});
    // Decode before OCR so unsupported formats get a helpful error.
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      try { await image.decode(); } catch {
        throw new Error('This image format could not be opened. Try a JPG, PNG, or a screenshot of the receipt.');
      }
      const longest=Math.max(image.naturalWidth,image.naturalHeight);
      const scale=Math.min(longest<1500?2:1,4400/longest);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not prepare this image.');
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const original=await worker.recognize(canvas);
      stage='Reading enhanced photo';onProgress('Removing shadows and checking receipt columns…');
      cleanReceiptImage(canvas);
      const enhanced=await worker.recognize(canvas);
      const score=(text:string,confidence:number)=>{const parsed=parseReceipt(text),sum=parsed.items.reduce((total,item)=>total+Math.round(item.price*item.quantity*100),0)/100;return (parsed.printedSubtotal!==null&&Math.abs(sum-parsed.printedSubtotal)<.02?1000:0)- (parsed.printedSubtotal===null?0:Math.min(1000,Math.abs(sum-parsed.printedSubtotal))*5)+parsed.items.length*2-parsed.warnings.length*5+confidence/10};
      const selected=score(enhanced.data.text,enhanced.data.confidence)>=score(original.data.text,original.data.confidence)?enhanced:original;
      return {text:selected.data.text,restaurant:parseReceiptHeader(original.data.text).restaurant||parseReceiptHeader(selected.data.text).restaurant};
    } finally { URL.revokeObjectURL(url); }
  };
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('The scan took too long. Try a smaller, clearer JPG or PNG.')), 90000);
      }),
    ]);
  } finally {
    finished = true;
    clearTimeout(timer);
    if (worker) await worker.terminate();
  }
}
