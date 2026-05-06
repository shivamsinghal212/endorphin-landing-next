import fs from 'node:fs/promises';
import path from 'node:path';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Methodology — Working Paper No. 1 | Endorfin',
  description:
    "The methodology behind Kip — Endorfin's hyperlocal AI running coach. Working paper covering framework selection, environmental adaptation, equipment-free substitutes, and masters protocols.",
  alternates: { canonical: 'https://www.endorfin.run/whitepaper' },
  openGraph: {
    type: 'article',
    url: 'https://www.endorfin.run/whitepaper',
    title: 'Kip Methodology — Endorfin Working Paper No. 1',
    description:
      'The hyperlocal AI running coach methodology paper — frameworks, environmental adaptation, equipment-free protocols.',
    siteName: 'Endorfin',
    locale: 'en_IN',
  },
};

export default async function WhitepaperPage() {
  const filePath = path.join(process.cwd(), 'src/content/whitepaper.md');
  const content = await fs.readFile(filePath, 'utf-8');

  return (
    <main id="main-content" className="wp-page overflow-x-hidden">
      <Header />
      <article className="wp-article">
        <div className="wp-container">
          <Link href="/workout-plan" className="wp-back">
            <ArrowLeft className="wp-back-icon" /> Back to workout plan
          </Link>
          <div className="wp-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
      </article>
      <Footer />
    </main>
  );
}
