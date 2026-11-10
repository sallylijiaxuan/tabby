/** Receipt photos live in IndexedDB, separate from the small bill records. */
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('tabby-files',1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('receipts'))request.result.createObjectStore('receipts')};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(new Error('Receipt storage is unavailable.'));
  });
}
async function operate<T>(mode:IDBTransactionMode,action:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
  const db=await database();
  return new Promise((resolve,reject)=>{
    const transaction=db.transaction('receipts',mode),request=action(transaction.objectStore('receipts'));
    transaction.oncomplete=()=>{db.close();resolve(request.result)};
    transaction.onerror=transaction.onabort=()=>{db.close();reject(transaction.error||request.error||new Error('Receipt storage failed.'))};
  });
}
type StoredImage={bytes:ArrayBuffer;type:string};
export async function getReceiptImage(id:string):Promise<Blob|undefined>{
  const stored=await operate<Blob|StoredImage|undefined>('readonly',store=>store.get(id));
  if(!stored)return undefined;
  // Keep compatibility with photos saved before binary records were introduced.
  return stored instanceof Blob?stored:new Blob([stored.bytes],{type:stored.type});
}
export async function saveReceiptImage(id:string,image:Blob){
  // Copy bytes rather than retaining a temporary photo-picker File reference.
  const stored:StoredImage={bytes:await image.arrayBuffer(),type:image.type};
  return operate<IDBValidKey>('readwrite',store=>store.put(stored,id));
}
export const deleteReceiptImage=(id:string)=>operate<undefined>('readwrite',store=>store.delete(id));
