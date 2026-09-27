import type { Metadata } from 'next'; import './globals.css'; import './photo.css';
export const metadata: Metadata = { title: 'Kirana Saathi', description: 'AI-assisted local grocery ordering' };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
