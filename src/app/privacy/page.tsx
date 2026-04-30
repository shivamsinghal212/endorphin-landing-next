import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Endorfin Privacy Policy — Learn how we collect, use, and protect your personal data.',
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors font-body mb-10">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <h1 className="text-4xl md:text-5xl font-display font-bold uppercase text-foreground mb-8">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground font-body mb-10">Last updated: April 30, 2026</p>

        <div className="space-y-8 font-body text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">1. Information We Collect</h2>
            <p className="mb-3">We collect the following categories of information when you use Endorfin:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><span className="text-foreground/80">Account information:</span> Your name, email address, and (if you sign in with Google) Google profile photo. You can register either by email and password — in which case we send a one-time passcode (OTP) to verify your address — or via Google Sign-In (OAuth 2.0).</li>
              <li><span className="text-foreground/80">Profile information:</span> Bio, running preferences, profile visibility settings, and a profile picture you upload from your device.</li>
              <li><span className="text-foreground/80">Photos and uploads:</span> Profile pictures, event cover photos, event gallery photos, and images you share inside chats. These are stored on our hosted file storage (Supabase Storage).</li>
              <li><span className="text-foreground/80">User-generated content:</span> Messages, replies, polls, votes, reactions, pinned posts, and any answers you submit to a club&apos;s join form when you request to join.</li>
              <li><span className="text-foreground/80">Club and event activity:</span> Events you RSVP to, clubs you&apos;ve requested to join or are a member of, your role within a club (member, admin, owner), and the status of your join requests.</li>
              <li><span className="text-foreground/80">Social graph:</span> Follow/unfollow actions, follow requests, and the relationships you build with other users.</li>
              <li><span className="text-foreground/80">Location data:</span> Your device&apos;s GPS coordinates (with your permission) to show nearby running events and personalize recommendations.</li>
              <li><span className="text-foreground/80">Device information:</span> Push notification tokens, device type, operating system version, and app version, used to deliver notifications and ensure compatibility.</li>
              <li><span className="text-foreground/80">Diagnostics:</span> Crash reports and error logs (which may include device metadata and the screen you were on at the time of the crash) used to fix bugs.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Authenticate you, verify your email via OTP, and keep you signed in across sessions.</li>
              <li>Personalize event and club recommendations based on your location and interests.</li>
              <li>Process and display your RSVPs to event organizers and other attendees.</li>
              <li>Operate clubs: process join requests, share your join-form answers and email with the relevant club&apos;s admins for review, and gate club discussions to active members.</li>
              <li>Power chat features: deliver your messages, replies, polls, reactions, and any images you share to other participants in the same thread (event attendees or club members).</li>
              <li>Enable social features including following other runners and managing follow requests.</li>
              <li>Send push notifications for new messages in clubs and events you participate in, follow requests, RSVP updates, and other relevant activity.</li>
              <li>Send transactional emails — OTP codes, password resets, club admin notifications, club welcome emails, and rejection emails — via our email provider.</li>
              <li>Provide AI-assisted training suggestions through Kip, our AI Coach. When you use Kip, your run history, fitness metrics, and message context are sent to our AI provider (Anthropic) to generate a response.</li>
              <li>Improve app performance, fix bugs, and develop new features.</li>
              <li>Enforce our Terms of Service and protect against misuse.</li>
            </ul>
            <p className="mt-3">We do not sell your personal data to third parties. Your data is not used to train any third-party AI model.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">3. Third-Party Services</h2>
            <p className="mb-3">Endorfin relies on the following third-party services to operate. Each may process some of your data on our behalf:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><span className="text-foreground/80">Google Sign-In:</span> Authentication for users who choose Google. Subject to <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Google&apos;s Privacy Policy</a>.</li>
              <li><span className="text-foreground/80">Supabase:</span> Database hosting (Postgres) and file storage for uploaded photos. Subject to <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Supabase&apos;s Privacy Policy</a>.</li>
              <li><span className="text-foreground/80">Railway:</span> Hosting our backend API. Subject to <a href="https://railway.app/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Railway&apos;s Privacy Policy</a>.</li>
              <li><span className="text-foreground/80">Expo Push Notifications:</span> Delivering push notifications to your device. Subject to <a href="https://expo.dev/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Expo&apos;s Privacy Policy</a>.</li>
              <li><span className="text-foreground/80">Resend:</span> Sending transactional emails (OTP, password reset, club notifications). Subject to <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Resend&apos;s Privacy Policy</a>.</li>
              <li><span className="text-foreground/80">Sentry:</span> Crash and error reporting. Subject to <a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Sentry&apos;s Privacy Policy</a>.</li>
              <li><span className="text-foreground/80">Detour:</span> Deep linking and deferred deep links. Subject to <a href="https://godetour.com/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Detour&apos;s Privacy Policy</a>.</li>
              <li><span className="text-foreground/80">Anthropic (Claude):</span> Powers the Kip AI Coach. When you interact with Kip, the relevant conversation context and your run/profile metrics are sent to Anthropic to generate a response. Subject to <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Anthropic&apos;s Privacy Policy</a>. Anthropic does not use your data to train its models.</li>
              <li><span className="text-foreground/80">Event platforms:</span> When you RSVP to events sourced from external platforms, limited profile information (name, profile photo) may be visible to event organizers and other attendees.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">4. Data Sharing</h2>
            <p className="mb-3">We may share your information in the following circumstances:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>With event organizers when you RSVP to their events (name and profile photo).</li>
              <li>With club admins when you request to join their club — they receive your name, email, profile photo, and any answers you provide in the club&apos;s join form.</li>
              <li>With other club members for content you post in a club discussion (your name, profile photo, messages, replies, polls, reactions, and any images you share). Club discussions are scoped to active members.</li>
              <li>With other event attendees for content you post in an event discussion (same scope as above).</li>
              <li>With other users based on your privacy settings (public profiles are visible to all users; private profiles require follow approval).</li>
              <li>With service providers who help us operate the platform (see Section 3).</li>
              <li>When required by law, legal process, or to protect our rights and safety.</li>
              <li>In aggregated, anonymized form for analytics purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">5. Data Storage and Security</h2>
            <p>We implement industry-standard security measures to protect your personal information, including encryption in transit (HTTPS/TLS) and secure token storage on your device. Authentication tokens are stored using platform-native secure storage mechanisms. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">6. Data Retention</h2>
            <p>We retain your personal information for as long as your account is active or as needed to provide our services. If you delete your account, we will delete or anonymize your personal data within 30 days, except where retention is required by law or for legitimate business purposes (such as resolving disputes or enforcing our terms).</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">7. Your Rights</h2>
            <p className="mb-3">You have the following rights regarding your personal data:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><span className="text-foreground/80">Access and portability:</span> Request a copy of the personal data we hold about you.</li>
              <li><span className="text-foreground/80">Correction:</span> Update or correct inaccurate information through your profile settings.</li>
              <li><span className="text-foreground/80">Deletion:</span> Request deletion of your account and associated data.</li>
              <li><span className="text-foreground/80">Opt-out:</span> Disable push notifications through your device settings or opt out of marketing communications.</li>
              <li><span className="text-foreground/80">Withdraw consent:</span> Revoke location permissions at any time through your device settings.</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, contact us at the address below or use the in-app settings.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">8. Applicable Law</h2>
            <p>This Privacy Policy is governed by the laws of India, including the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023 (DPDPA) as applicable. If you are located outside India, please be aware that your data may be transferred to and processed in India.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">9. Children&apos;s Privacy</h2>
            <p>Endorfin is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we learn that we have collected data from a child under 13, we will delete it promptly.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes through the app or via email. Continued use of Endorfin after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">11. Contact Us</h2>
            <p>If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us at <a href="mailto:hello@endorfin.run" className="text-accent hover:underline">hello@endorfin.run</a>.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
