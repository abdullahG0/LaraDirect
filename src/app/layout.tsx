import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google'; // downloaded at build time and self-hosted by next/font
import { siteUrl } from '@/lib/site-url';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'LaraDirect: Tech for teachers and schools', template: '%s | LaraDirect' },
  description: 'Laptops, iPads, headsets and classroom tech for UK teachers and schools.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${inter.variable} ${outfit.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
