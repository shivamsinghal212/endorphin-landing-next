import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Delete your Endorfin account',
  description:
    'How to delete your Endorfin account and data, what is deleted, what is kept, and for how long.',
};

const SUPPORT_EMAIL = 'hello@endorfin.run';

// The deletion URL in the Play Console Data safety form points here. Google
// requires it to name the app, give the steps, and say what is deleted, what
// is kept and for how long — keep it in step with DELETE /users/me and
// DELETE /runs/imported in the backend, and with Section 8 of /privacy.
export default function DeleteAccount() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link
          href="/support"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors font-body mb-10"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Support
        </Link>

        <h1 className="text-4xl md:text-5xl font-display font-bold uppercase text-foreground mb-4">
          Delete your Endorfin account
        </h1>
        <p className="text-muted-foreground font-body mb-12">
          Endorfin is operated by Ultragon Ventures (OPC) Private Limited. You can delete your
          account and its data at any time, from the app or by email.
        </p>

        <div className="space-y-10 font-body text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-2xl font-display font-semibold uppercase text-foreground mb-4">
              How to delete your account
            </h2>
            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>
                <span className="text-foreground/80">In the app:</span> open Settings, go to the
                Account section, tap <span className="text-foreground/80">Delete Account</span>, and
                confirm. Your account is deleted straight away.
              </li>
              <li>
                <span className="text-foreground/80">Without the app:</span> email{' '}
                <a href={`mailto:${SUPPORT_EMAIL}?subject=Delete%20my%20account`} className="text-accent hover:underline">
                  {SUPPORT_EMAIL}
                </a>{' '}
                from the address on your account, with the subject &ldquo;Delete my account&rdquo;. We
                confirm and complete the deletion within 30 days.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold uppercase text-foreground mb-4">
              Delete only your synced health data
            </h2>
            <p>
              To keep your account but remove everything synced from Health Connect or Apple Health,
              open Settings → Connect apps and devices and tap{' '}
              <span className="text-foreground/80">Delete imported activity</span>. This deletes
              every synced workout and your VO₂ max immediately, and disconnects your health
              platform. You can also delete a single workout from its detail screen.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold uppercase text-foreground mb-4">
              What is deleted
            </h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                Your account and profile details: name, email address, profile photo, city, date of
                birth, gender, phone number, weight, Strava profile link, password, and Google or
                Apple sign-in links.
              </li>
              <li>
                All activity synced from Health Connect or Apple Health, including routes, heart
                rate and other workout data, and your VO₂ max.
              </li>
            </ul>
            <p className="mt-3">These are deleted immediately when you delete your account.</p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold uppercase text-foreground mb-4">
              What is kept, and for how long
            </h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                Runs you recorded in Endorfin and your challenge results are kept without your name
                or profile, so challenge results and leaderboards stay accurate.
              </li>
              <li>
                Messages and posts you made in club or event discussions remain, shown as
                &ldquo;Deleted User&rdquo;.
              </li>
              <li>
                Event registration and payment records are kept for as long as tax and accounting
                law requires. Card and UPI details are handled by Razorpay and never stored by
                Endorfin.
              </li>
            </ul>
            <p className="mt-3">
              Any other personal data is deleted or anonymised within 30 days, as described in our{' '}
              <Link href="/privacy" className="text-accent hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-semibold uppercase text-foreground mb-4">
              Questions
            </h2>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-card border border-border hover:border-accent/50 transition-colors"
            >
              <Mail className="w-5 h-5 text-accent" />
              <span className="text-foreground font-body">{SUPPORT_EMAIL}</span>
            </a>
          </section>
        </div>
      </div>
    </main>
  );
}
