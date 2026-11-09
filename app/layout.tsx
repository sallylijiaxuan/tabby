import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Tabby — Good food. Fair shares.', description: 'Scan your restaurant receipt, assign dishes to friends, and split tax and tip fairly.' };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
