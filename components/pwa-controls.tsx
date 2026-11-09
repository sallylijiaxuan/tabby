"use client";
import {useEffect,useState} from 'react';
import {Download,Share,PlusSquare,X,WifiOff,RefreshCw,Check} from 'lucide-react';
type InstallEvent = Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
export function PwaControls(){
 const [standalone,setStandalone]=useState(true),[instructions,setInstructions]=useState(false),[offline,setOffline]=useState(false),[offlineReady,setOfflineReady]=useState(false),[setupFailed,setSetupFailed]=useState(false),[waiting,setWaiting]=useState<ServiceWorker|null>(null),[install,setInstall]=useState<InstallEvent|null>(null);
 useEffect(()=>{
  const mode=matchMedia('(display-mode: standalone)');
  const updateMode=()=>setStandalone(mode.matches||!!(navigator as Navigator & {standalone?:boolean}).standalone);
  const online=()=>setOffline(!navigator.onLine);
  const prompt=(event:Event)=>{event.preventDefault();setInstall(event as InstallEvent)};
  updateMode();online();mode.addEventListener('change',updateMode);window.addEventListener('online',online);window.addEventListener('offline',online);window.addEventListener('beforeinstallprompt',prompt);window.addEventListener('appinstalled',updateMode);
  let disposed=false;
  let registrationRef:ServiceWorkerRegistration|undefined;
  const checkForUpdate=()=>{if(document.visibilityState==='visible'&&navigator.onLine)registrationRef?.update().catch(()=>{})};
  document.addEventListener('visibilitychange',checkForUpdate);
  if(process.env.NODE_ENV==='production'&&'serviceWorker' in navigator){
   navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(registration=>{
    if(disposed)return;
    registrationRef=registration;checkForUpdate();
    if(registration.waiting)setWaiting(registration.waiting);
    registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(!disposed&&worker.state==='installed'){if(navigator.serviceWorker.controller)setWaiting(worker);else setOfflineReady(true)}if(!disposed&&worker.state==='redundant')setSetupFailed(true)})});
    navigator.serviceWorker.ready.then(()=>{if(!disposed)setOfflineReady(true)});
   }).catch(()=>{if(!disposed)setSetupFailed(true)});
  }
  return()=>{disposed=true;document.removeEventListener('visibilitychange',checkForUpdate);mode.removeEventListener('change',updateMode);window.removeEventListener('online',online);window.removeEventListener('offline',online);window.removeEventListener('beforeinstallprompt',prompt);window.removeEventListener('appinstalled',updateMode)};
 },[]);
 async function installApp(){if(install){await install.prompt();const result=await install.userChoice;if(result.outcome==='accepted')setStandalone(true);setInstall(null)}else setInstructions(true)}
 function update(){if(!waiting)return;navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});waiting.postMessage('SKIP_WAITING')}
 return <>{(!standalone||offline||waiting||setupFailed)&&<div className="pwa-bar">{offline?<span role="status"><WifiOff size={15}/> You’re offline. Your saved bills are here.</span>:<span><span className="pwa-app-icon">t.</span><span><strong>Tabby, on your home screen.</strong><small>{setupFailed?'Offline setup couldn’t finish. Open online and refresh to retry.':offlineReady?'Ready to use offline':'Install for a full-screen experience.'}</small></span></span>}{waiting?<button onClick={update}><RefreshCw size={14}/> Update app</button>:!standalone&&<button onClick={installApp}><Download size={14}/> Install app</button>}</div>}{standalone&&!offline&&!waiting&&offlineReady&&<div className="offline-ready"><Check size={12}/> Ready offline · Bills saved on this device</div>}{instructions&&<div className="modal-backdrop" onClick={()=>setInstructions(false)}><div className="modal install-modal" role="dialog" aria-modal="true" aria-label="Install Tabby" onClick={e=>e.stopPropagation()}><button className="close" aria-label="Close install instructions" onClick={()=>setInstructions(false)}><X size={20}/></button><div className="modal-symbol"><Download/></div><h2>Tabby, one tap away.</h2><p>On your iPhone, open this page in <strong>Safari</strong>, then:</p><ol><li><Share size={18}/><span>Tap <strong>Share</strong> in Safari. If hidden, open the <strong>More (…)</strong> menu first.</span></li><li><PlusSquare size={18}/><span>Choose <strong>Add to Home Screen</strong>.</span></li><li><Check size={18}/><span>Leave <strong>Open as Web App</strong> on if shown, then tap <strong>Add</strong>.</span></li></ol><p>Open Tabby from its new icon. Open it online once and wait for “Ready offline” before using it without internet.</p><small className="install-other">On Android, use your browser’s menu → Install app or Add to Home screen.</small><button className="primary" onClick={()=>setInstructions(false)}>Got it <Check size={16}/></button></div></div>}</>;
}
