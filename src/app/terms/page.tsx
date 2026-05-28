import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Endorfin Terms of Service — The terms and conditions for using the Endorfin app.',
};

export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors font-body mb-10">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <h1 className="text-4xl md:text-5xl font-display font-bold uppercase text-foreground mb-8">
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground font-body mb-10">Last updated: May 28, 2026</p>

        <div className="space-y-8 font-body text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using the Endorfin mobile application (&quot;App&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not use the App.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">2. Eligibility</h2>
            <p>You must be at least 13 years of age to use Endorfin. If you are under 18, you represent that you have your parent or guardian&apos;s consent to use the App. By using the App, you represent and warrant that you meet these requirements.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">3. Use of Service</h2>
            <p>Endorfin provides a platform to discover running events, RSVP to them, and connect with other runners. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">4. User Conduct</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Create fake events, profiles, or misleading content.</li>
              <li>Harass, bully, or intimidate other users.</li>
              <li>Impersonate any person or entity.</li>
              <li>Use automated systems, bots, or scrapers to access the App without permission.</li>
              <li>Attempt to gain unauthorized access to other users&apos; accounts or our systems.</li>
              <li>Use the App for any unlawful purpose or in violation of any applicable laws.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">5. Event Listings and Third-Party Registration Platforms</h2>
            <p>Endorfin is a discovery platform for running events and is not the event organizer for the majority of events listed. We aggregate event information from a variety of public sources and third-party registration platforms, including but not limited to <span className="text-foreground/80">MySamay</span>, <span className="text-foreground/80">Townscript</span>, <span className="text-foreground/80">IndiaRunning</span>, and <span className="text-foreground/80">City Woofer</span>. Only events explicitly labelled as being hosted by Endorfin (i.e. where the event source is &ldquo;Organiser&rdquo; on the platform) are events for which Endorfin acts as the registration host; all other listings are third-party events for which Endorfin is solely a directory and discovery surface.</p>
            <p className="mt-3">When you click &ldquo;Register&rdquo; on a third-party event, you are redirected to the relevant third-party registration platform and your registration, payment, refund, and all related obligations are governed entirely by that platform&apos;s terms and the organizer&apos;s policies — not by Endorfin. You acknowledge that:</p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-3">
              <li>Events may be cancelled, rescheduled, or modified by organizers or third-party platforms without notice to us, and listing details on Endorfin (including dates, pricing, course, and availability) may lag behind the source of truth.</li>
              <li>You should always verify event details, payment terms, and refund policies directly with the official event organizer or third-party registration platform before completing a registration.</li>
              <li>Endorfin makes no representations or warranties about third-party events and is not responsible for any injuries, losses, damages, payment disputes, refund delays, or registration issues arising from events discovered through the App or registered for on third-party platforms.</li>
              <li>RSVP through Endorfin does not constitute official event registration unless the event is explicitly hosted on Endorfin (source = &ldquo;Organiser&rdquo;).</li>
              <li>Any trademarks, event names, logos, or brand assets shown alongside third-party listings remain the property of their respective owners and are used solely to identify the event being listed.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">6. Account Termination</h2>
            <p>We reserve the right to suspend or terminate your account at our discretion, with or without notice, if we believe you have violated these Terms or engaged in conduct that is harmful to other users, the App, or third parties. You may also delete your account at any time through the App&apos;s settings. Upon termination, your right to use the App ceases immediately.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">7. Intellectual Property</h2>
            <p>All content, trademarks, logos, and intellectual property on the Endorfin platform are owned by or licensed to us. You may not reproduce, distribute, modify, or create derivative works without our prior written consent. You retain ownership of any content you submit (such as profile information), but grant us a non-exclusive, worldwide license to use, display, and distribute such content in connection with the App.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">8. Limitation of Liability</h2>
            <p>Endorfin is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied. To the fullest extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App, including but not limited to injuries sustained during events, loss of data, or service interruptions.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">9. Dispute Resolution</h2>
            <p>Any disputes arising out of or relating to these Terms or your use of the App shall first be attempted to be resolved through informal negotiation. If the dispute cannot be resolved informally within 30 days, either party may pursue resolution through the courts of competent jurisdiction in India.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">10. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of India, without regard to conflict of law principles.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">11. Changes to Terms</h2>
            <p>We reserve the right to modify these Terms at any time. We will notify you of material changes through the App or via email. Continued use of the App after changes constitutes acceptance of the updated Terms. If you do not agree with the changes, you must stop using the App.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">12. Contact Us</h2>
            <p>For questions about these Terms of Service, contact us at <a href="mailto:hello@endorfin.run" className="text-accent hover:underline">hello@endorfin.run</a>.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
