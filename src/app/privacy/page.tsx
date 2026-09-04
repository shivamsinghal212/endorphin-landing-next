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
        <p className="text-sm text-muted-foreground font-body mb-10">Last updated: September 4, 2026</p>

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
              <li><span className="text-foreground/80">Event registration &amp; payment information:</span> When you register for an event hosted directly on Endorfin (source &ldquo;Organiser&rdquo;), we collect the details you provide for that registration — which may include your name, email, phone number, date of birth, gender, shipping address (for medal or merchandise delivery), T-shirt size, and your answers to the event&apos;s registration questions. Payments are processed by <span className="text-foreground/80">Razorpay</span>, our payment gateway; your card, UPI, or other payment credentials are entered on and handled by Razorpay — Endorfin does not receive or store them. We retain only your order and payment status (e.g. paid, refunded), the amount, and a payment reference.</li>
              <li><span className="text-foreground/80">Social graph:</span> Follow/unfollow actions, follow requests, and the relationships you build with other users.</li>
              <li><span className="text-foreground/80">Location data:</span> Your device&apos;s GPS coordinates (with your permission) to show nearby running events and personalize recommendations. When you start a run, we also record your live GPS location to map your route — tracking runs in a foreground service with a persistent notification so it continues while your screen is locked, and stopping when you end the run. We only access location while the app is in use; we do not track your location in the background outside of an active run.</li>
              <li><span className="text-foreground/80">Run and fitness data:</span> When you record a run, we collect its GPS route, distance, duration, pace, elevation, and step count/cadence (from your device&apos;s motion sensors and pedometer), along with an estimated calorie figure derived from these. This is stored on your account so you can review your run history and training stats.</li>
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
              <li>Record and display the runs you track — route, distance, pace, duration, elevation, and cadence — and build your personal run history and training stats.</li>
              <li>If you turn on health sync (Settings → Fitness; off by default), write your completed runs to your device&apos;s health platform — Health Connect on Android or Apple Health on iOS — and read the runs and walks you recorded in other apps or on other devices — along with their route, pace, heart rate, steps, elevation and your VO₂ max — so they appear in your Endorfin history. See Section 3.</li>
              <li>Generate a written analysis of an individual run, and build your training programme. These use two different AI providers and receive different data — see Section 4.</li>
              <li>Improve app performance, fix bugs, and develop new features.</li>
              <li>Enforce our Terms of Service and protect against misuse.</li>
            </ul>
            <p className="mt-3">We do not sell your personal data to third parties. Your data is not used to train any third-party AI model.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">3. Health &amp; Fitness Data (Health Connect &amp; Apple Health)</h2>
            <p className="mb-3">Endorfin can connect to your device&apos;s health platform — <span className="text-foreground/80">Health Connect</span> on Android and <span className="text-foreground/80">Apple Health</span> on iOS. The connection is strictly <span className="text-foreground/80">opt-in</span>, is turned off by default, and is enabled only when you switch on <span className="text-foreground/80">Sync with Health Connect</span> (or Apple Health) under Settings → Fitness. That single switch covers both directions described below, and you are shown exactly what it does before any permission is requested. Your device then asks which specific data types to allow, and you can permit some and refuse others — Endorfin honours whatever you choose, so if you allow only one direction, only that one operates.</p>
            <h3 className="text-base font-display font-semibold uppercase text-foreground mt-5 mb-2">3.1 Writing your Endorfin runs out</h3>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><span className="text-foreground/80">What we write:</span> the running workout session, its GPS route, total distance, and active calories burned. We do not write heart rate or any other data type.</li>
              <li><span className="text-foreground/80">Not for ads, never sold, not shared:</span> Data written to your health platform is never used for advertising, sold, or shared with third parties. It resides in your own device&apos;s health store, under your control.</li>
              <li><span className="text-foreground/80">Revoking access:</span> Turn sync off any time in Settings → Fitness, and revoke Endorfin&apos;s health permissions directly in the Health Connect app (Android) or Settings → Privacy &amp; Security → Health (iOS). Revoking does not remove runs already written — delete those in the health app itself.</li>
            </ul>
            <h3 className="text-base font-display font-semibold uppercase text-foreground mt-5 mb-2">3.2 Importing workouts you recorded elsewhere</h3>
            <p className="mb-3">When that switch is on and you have allowed read access, Endorfin reads completed run, walk and hike sessions from your health platform so that workouts you recorded on another device or in another app — a Garmin watch, an Apple Watch, Google Fit, Samsung Health, Coros and similar — appear in your Endorfin history alongside the runs you record in Endorfin, with the same level of detail: route map, pace graph, per-kilometre splits, heart-rate zones and elevation profile.</p>
            <p className="mb-3">We request only the data types that power features you can see in the app. For each one, this is what we read and where it appears:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><span className="text-foreground/80">Exercise sessions</span> — identifies each workout, its activity type and its start and end time, so it can be listed in your run history.</li>
              <li><span className="text-foreground/80">Distance</span> — shows how far each imported workout went, and contributes to your weekly totals, training stats and personal records.</li>
              <li><span className="text-foreground/80">Exercise route</span> — draws the map of where you ran on the workout detail screen, the same map shown for a run recorded in Endorfin.</li>
              <li><span className="text-foreground/80">Speed</span> — builds the pace graph and the per-kilometre splits table on the workout detail screen, and is used to estimate running power.</li>
              <li><span className="text-foreground/80">Heart rate</span> — shows average, maximum and minimum heart rate, the per-kilometre heart-rate graph, your time in each heart-rate zone, and cardiac drift, all on the workout detail screen.</li>
              <li><span className="text-foreground/80">Steps</span> — populates the steps figure on each workout and derives your average cadence in steps per minute.</li>
              <li><span className="text-foreground/80">Elevation gained</span> — shows total climb and the elevation profile for hilly runs.</li>
              <li><span className="text-foreground/80">Active calories burned</span> — populates the calories figure shown on the workout detail screen.</li>
              <li><span className="text-foreground/80">Total calories burned</span> — used only as a fallback for the same calories figure, when a device reports total but not active calories.</li>
              <li><span className="text-foreground/80">VO₂ max</span> — displays your aerobic capacity, with a plain-language band and the date it was measured, on the Training stats screen.</li>
              <li><span className="text-foreground/80">Past data (history)</span> — allows your first import to include workouts older than 30 days, so your history and personal records are complete rather than starting from the day you connected.</li>
            </ul>
            <p className="mt-3 mb-3"><span className="text-foreground/80">What we never read.</span> We read completed run, walk and hike workouts and the metrics attached to them, and nothing else. We do not read sleep, weight or body measurements, nutrition or hydration, blood glucose, blood pressure, body temperature, oxygen saturation, respiratory rate, heart-rate variability, resting heart rate, menstrual or reproductive health, sexual activity, substance use, self-reported symptoms, or any clinical vital or medical record. We do not read data in the background — an import runs only when you enable the feature or tap Import now.</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><span className="text-foreground/80">Filtering:</span> Only foot-based workouts (runs, walks, hikes) are imported. Other activity types, and sessions under a minute or with no distance, are ignored. Workouts that Endorfin itself wrote to the health platform are excluded, so they are not duplicated.</li>
              <li><span className="text-foreground/80">Where imported workouts go, and who can see them:</span> Imported workouts are treated the same as runs you record in Endorfin. That means they are stored on our servers as part of your run history, count toward your stats, personal records and any challenges you have joined, and are visible to your followers in the activity feed. Because this shares health data beyond your device, we ask for your explicit confirmation before the first import, in addition to the platform permission prompt. If you would rather your workouts not be visible to others, you can set your account to private under Settings → Privacy, or leave import turned off.</li>
              <li><span className="text-foreground/80">AI features:</span> If you ask for a written analysis of a run, that run&apos;s metrics — including those from an imported workout — are sent to Anthropic to generate it, as described in Section 4. Anthropic does not use this data to train its models. Our training-programme generator uses a different provider (Google) and is <span className="text-foreground/80">not</span> sent your health data: it receives only your training goal, experience level, available equipment, available days and how well you kept to your last programme. Health data is never sent to our analytics provider.</li>
              <li><span className="text-foreground/80">What is stored on our servers:</span> For each imported workout we store its summary metrics and a reduced time series of readings — location, altitude, pace, heart rate and cadence (roughly one reading per second, thinned for long workouts) — which is what allows the app to draw the route, pace, elevation and heart-rate graphs. Your VO₂ max is stored on your account rather than against a workout.</li>
              <li><span className="text-foreground/80">Retention and deletion:</span> Imported workouts are retained as part of your run history until you delete the individual run or your account. Deleting your account removes or anonymises them within 30 days, as described in Section 7. Turning import off stops all future reads; it does not delete workouts already imported — delete those individually in the app.</li>
              <li><span className="text-foreground/80">Never for ads, never sold:</span> Health and fitness data read from your health platform is never used for advertising or marketing, never sold, never shared with data brokers, and never used to determine eligibility for employment, insurance or credit. It is used only to provide the running features described here. On iOS, data read from Apple Health is not stored in iCloud.</li>
              <li><span className="text-foreground/80">Revoking access:</span> Turn the switch off any time under Settings → Fitness, which stops both directions immediately. You can also review or revoke individual data-type permissions via <span className="text-foreground/80">Manage access</span> in the same screen, which opens the Health Connect app (Android), or in Settings → Privacy &amp; Security → Health (iOS).</li>
            </ul>
            <p className="mt-3">Endorfin&apos;s access to Health Connect and Apple Health adheres to their respective developer and permissions policies, including the <a href="https://support.google.com/googleplay/android-developer/answer/13316080" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Health Connect Permissions policy</a> and its Limited Use requirements.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">4. Third-Party Services</h2>
            <p className="mb-3">Endorfin relies on the following third-party services to operate. Each may process some of your data on our behalf:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><span className="text-foreground/80">Google Sign-In:</span> Authentication for users who choose Google. Subject to <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Google&apos;s Privacy Policy</a>.</li>
              <li><span className="text-foreground/80">Supabase:</span> Database hosting (Postgres) and file storage for uploaded photos. Subject to <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Supabase&apos;s Privacy Policy</a>.</li>
              <li><span className="text-foreground/80">Railway:</span> Hosting our backend API. Subject to <a href="https://railway.app/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Railway&apos;s Privacy Policy</a>.</li>
              <li><span className="text-foreground/80">Expo Push Notifications:</span> Delivering push notifications to your device. Subject to <a href="https://expo.dev/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Expo&apos;s Privacy Policy</a>.</li>
              <li><span className="text-foreground/80">Resend:</span> Sending transactional emails (OTP, password reset, club notifications). Subject to <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Resend&apos;s Privacy Policy</a>.</li>
              <li><span className="text-foreground/80">Sentry:</span> Crash and error reporting. Subject to <a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Sentry&apos;s Privacy Policy</a>.</li>
              <li><span className="text-foreground/80">PostHog:</span> Product analytics — captures app screen views, interactions, and key events (such as starting or completing a run) to help us understand usage and improve the app. We do not send your health data to PostHog. Subject to <a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">PostHog&apos;s Privacy Policy</a>.</li>
              <li><span className="text-foreground/80">Detour:</span> Deep linking and deferred deep links. Subject to <a href="https://godetour.com/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Detour&apos;s Privacy Policy</a>.</li>
              <li><span className="text-foreground/80">Razorpay:</span> Processes payments for events you register for directly through Endorfin. You enter your payment details with Razorpay; Endorfin receives only the transaction status, amount, and reference — never your card or UPI credentials. Subject to <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Razorpay&apos;s Privacy Policy</a>.</li>
              <li><span className="text-foreground/80">Anthropic (Claude):</span> Generates the written analysis of an individual run, shown in the app as &quot;Kip&apos;s take&quot; on the run detail screen. When that analysis is produced, that run&apos;s metrics — distance, duration, pace and per-kilometre splits, and heart-rate figures including average, maximum, time in zones and cardiac drift where recorded — are sent to Anthropic. Nothing else about you is sent, and the analysis is generated per run rather than as a conversation. Subject to <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Anthropic&apos;s Privacy Policy</a>. Anthropic does not use your data to train its models.</li>
              <li><span className="text-foreground/80">Google (Gemini):</span> Generates your training programme. When a programme is built, we send your training goal, experience level, available equipment, which weekdays you can train, how long a session can be, your target race date if you set one, and a summary of how well you kept to your previous programme. We do <span className="text-foreground/80">not</span> send heart rate, VO₂ max, route, weight, or any data read from Health Connect or Apple Health. Subject to <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Google&apos;s Privacy Policy</a>.</li>
              <li><span className="text-foreground/80">Third-party event registration platforms:</span> Many events listed on Endorfin are hosted on third-party registration platforms — including <span className="text-foreground/80">MySamay</span>, <span className="text-foreground/80">Townscript</span>, <span className="text-foreground/80">IndiaRunning</span>, and <span className="text-foreground/80">City Woofer</span>. Only events explicitly listed with source &ldquo;Organiser&rdquo; are registered through Endorfin directly. When you click &ldquo;Register&rdquo; on a third-party event, we redirect you to the relevant external platform. Any information you submit there (name, contact details, payment information, etc.) is collected and processed by that platform under its own privacy policy, not Endorfin&apos;s. We do not receive your registration or payment data from those platforms unless they share it with us in aggregate or you authorise it explicitly.</li>
              <li><span className="text-foreground/80">Event organizers:</span> When you RSVP to or register for an event through Endorfin (whether hosted by us or by a third-party platform), limited profile information (name, profile photo) may be visible to event organizers and other attendees.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">5. Data Sharing</h2>
            <p className="mb-3">We may share your information in the following circumstances:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>With event organizers when you RSVP to their events (name and profile photo).</li>
              <li>With <span className="text-foreground/80">Razorpay</span> to process payments for events you register for directly on Endorfin (your name, email, phone, and the amount).</li>
              <li>With the <span className="text-foreground/80">event organizer</span> when you register for an Endorfin-hosted event — the registration details you submit (name, contact details, date of birth, gender, T-shirt size, and any answers to the event&apos;s questions) so they can manage entries, logistics, and results.</li>
              <li>With shipping or courier partners when an event includes a mailed medal or merchandise — your shipping address, solely to fulfil delivery.</li>
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
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">6. Data Storage and Security</h2>
            <p>We implement industry-standard security measures to protect your personal information, including encryption in transit (HTTPS/TLS) and secure token storage on your device. Authentication tokens are stored using platform-native secure storage mechanisms. However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">7. Data Retention</h2>
            <p>We retain your personal information for as long as your account is active or as needed to provide our services. If you delete your account, we will delete or anonymize your personal data within 30 days, except where retention is required by law or for legitimate business purposes (such as resolving disputes or enforcing our terms).</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">8. Your Rights</h2>
            <p className="mb-3">You have the following rights regarding your personal data:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><span className="text-foreground/80">Access and portability:</span> Request a copy of the personal data we hold about you.</li>
              <li><span className="text-foreground/80">Correction:</span> Update or correct inaccurate information through your profile settings.</li>
              <li><span className="text-foreground/80">Deletion:</span> Request deletion of your account and associated data.</li>
              <li><span className="text-foreground/80">Opt-out:</span> Disable push notifications through your device settings or opt out of marketing communications.</li>
              <li><span className="text-foreground/80">Withdraw consent:</span> Revoke location or motion permissions at any time through your device settings. Turn off Sync with Health Connect (or Apple Health) under Settings → Fitness, and revoke health permissions in Health Connect (Android) or Settings → Privacy &amp; Security → Health (iOS).</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, contact us at the address below or use the in-app settings.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">9. Applicable Law</h2>
            <p>This Privacy Policy is governed by the laws of India, including the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023 (DPDPA) as applicable. If you are located outside India, please be aware that your data may be transferred to and processed in India.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">10. Children&apos;s Privacy</h2>
            <p>Endorfin is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we learn that we have collected data from a child under 13, we will delete it promptly.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">11. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes through the app or via email. Continued use of Endorfin after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">12. Contact Us</h2>
            <p>If you have questions about this Privacy Policy or wish to exercise your data rights, please contact us at <a href="mailto:hello@endorfin.run" className="text-accent hover:underline">hello@endorfin.run</a>.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
