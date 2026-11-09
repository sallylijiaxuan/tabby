import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Tabby — Good food. Fair shares.', description: 'Scan your restaurant receipt, assign dishes to friends, and split tax and tip fairly.', manifest: '/manifest.webmanifest', appleWebApp: {capable:true, title:'Tabby', statusBarStyle:'default'}, icons:{icon:'/icons/icon-192.png',apple:'/icons/apple-touch-icon.png'} };
export const viewport: Viewport = {width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#f9faf6'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
