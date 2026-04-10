import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get help with Endorfin — Contact us for questions, bug reports, or feedback.',
};

const SUPPORT_EMAIL = "shivam.singhal212@gmail.com";

export default function Support() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors font-body mb-10"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <h1 className="text-4xl md:text-5xl font-display font-bold uppercase text-foreground mb-4">
          Support
        </h1>
        <p className="text-muted-foreground font-body mb-10">
          Have a question, found a bug, or need help? Reach out and we&apos;ll get back to you.
        </p>

        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-card border border-border hover:border-accent/50 transition-colors"
        >
          <Mail className="w-5 h-5 text-accent" />
          <span className="text-foreground font-body">{SUPPORT_EMAIL}</span>
        </a>
      </div>
    </main>
  );
}
