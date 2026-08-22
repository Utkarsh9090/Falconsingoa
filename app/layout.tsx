import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Voice RAG | Falcons × HH Goa 2026',
  description:
    'A voice-enabled Retrieval-Augmented Generation system — speak a question, get a grounded, sourced answer in under 200ms.',
  metadataBase: new URL('http://localhost:5173'),
  openGraph: {
    title: 'Voice RAG — Falcons × HH Goa 2026',
    description:
      'Voice → STT → Chunking → Vector Retrieval → Grounded Generation. Under 200ms.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
