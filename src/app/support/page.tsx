import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Support & FAQ',
  description: 'Get help with Endorfin. Find answers to common questions about RSVP, community runs, account management, and more. Contact us at hello@endorfin.run.',
};

const SUPPORT_EMAIL = "hello@endorfin.run";

const faqs = [
  {
    q: "How do I RSVP for a running event?",
    a: "Open the event page on Endorfin and tap the \"Going\" button. That's it — one tap and you're registered. You'll see the event in your upcoming races on your profile.",
  },
  {
    q: "Is Endorfin free to use?",
    a: "Yes, Endorfin is completely free. You can discover events, RSVP, create community runs, and connect with other runners at no cost. We don't charge any fees for using the app.",
  },
  {
    q: "Which cities does Endorfin cover?",
    a: "Endorfin lists running events across 25+ cities in India including Mumbai, Delhi, Bangalore, Pune, Hyderabad, Chennai, Kolkata, Ahmedabad, Jaipur, Chandigarh, and many more. We're constantly adding new cities.",
  },
  {
    q: "Can I create my own community run?",
    a: "Absolutely! Tap the Create button in the app, set a date, time, meeting point, distance, and pace — then invite friends or make it public for anyone to join.",
  },
  {
    q: "How do I find events near me?",
    a: "Endorfin uses your city to show relevant events. You can also use the search and filter options to find events by distance category (5K, 10K, half marathon, marathon), date, or specific city.",
  },
  {
    q: "Is my data safe?",
    a: "Yes. We take data privacy seriously and comply with the Digital Personal Data Protection Act (DPDPA) 2023. Read our Privacy Policy for full details on how we handle your data.",
  },
  {
    q: "How do I report incorrect event information?",
    a: "If you find an event with wrong details, please email us at hello@endorfin.run with the event name and what needs to be corrected. We'll update it within 24 hours.",
  },
  {
    q: "Is Endorfin available on iOS?",
    a: "Endorfin is currently available on Android via Google Play. An iOS version is coming soon — follow us on Twitter @endorfinapp for updates.",
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.a,
    },
  })),
};

export default function Support() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors font-body mb-10"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <h1 className="text-4xl md:text-5xl font-display font-bold uppercase text-foreground mb-4">
          Support & FAQ
        </h1>
        <p className="text-muted-foreground font-body mb-12">
          Find answers to common questions below, or reach out directly if you need more help.
        </p>

        {/* FAQ Section */}
        <section className="space-y-8 mb-16">
          <h2 className="text-2xl font-display font-semibold uppercase text-foreground">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <details key={i} className="group rounded-xl bg-card border border-border p-5">
                <summary className="cursor-pointer font-body font-medium text-foreground list-none flex items-center justify-between">
                  {faq.q}
                  <span className="text-muted-foreground group-open:rotate-45 transition-transform text-xl ml-4">+</span>
                </summary>
                <p className="mt-3 font-body text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <section>
          <h2 className="text-2xl font-display font-semibold uppercase text-foreground mb-4">
            Still Need Help?
          </h2>
          <p className="text-muted-foreground font-body mb-6">
            Can&apos;t find what you&apos;re looking for? Email us and we&apos;ll get back to you within 24 hours.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-card border border-border hover:border-accent/50 transition-colors"
          >
            <Mail className="w-5 h-5 text-accent" />
            <span className="text-foreground font-body">{SUPPORT_EMAIL}</span>
          </a>
        </section>
      </div>
    </main>
  );
}
