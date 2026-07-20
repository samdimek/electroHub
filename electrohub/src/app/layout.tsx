import type { Metadata } from 'next';
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', weight: ['500', '600', '700'] });
const body = IBM_Plex_Sans({ subsets: ['latin'], variable: '--font-body', weight: ['400', '500', '600'] });
const mono = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400', '500'] });

export const metadata: Metadata = {
  title: {
    default: 'ElectroHub — Electronics from vetted vendors',
    template: '%s · ElectroHub',
  },
  description:
    'ElectroHub is a marketplace exclusively for electronics vendors — audio, computing, components, and more, backed by warranty tracking on every order.',
  metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="bg-ink-950 text-ink-100 font-body antialiased">{children}</body>
    </html>
  );
}
