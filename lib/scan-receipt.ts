import type { Worker } from 'tesseract.js';

export async function scanReceipt(file: File, onProgress: (message: string) => void) {
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
      logger: message => {
        if (finished) return;
        onProgress(message.status === 'recognizing text'
          ? `Reading receipt… ${Math.round(message.progress * 100)}%`
          : 'Preparing the receipt reader…');
      },
    });
    if (finished) { await created.terminate(); throw new Error('Scan timed out.'); }
    worker = created;
    // Decode before OCR so unsupported formats get a helpful error.
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      try { await image.decode(); } catch {
        throw new Error('This image format could not be opened. Try a JPG, PNG, or a screenshot of the receipt.');
      }
      const scale = Math.min(2, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not prepare this image.');
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const result = await worker.recognize(canvas);
      return result.data.text;
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
