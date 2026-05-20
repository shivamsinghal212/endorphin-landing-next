import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import NextButton from './NextButton';
import './club-pitch-deck.css';

const PAGE_URL = 'https://www.endorfin.run/club-pitch-deck';
const PAGE_TITLE = 'Run Clubs in India — Free Platform for Founders';
const PAGE_DESCRIPTION =
  'Free platform for Indian run clubs. SEO-ranked club pages on Google, private in-app chat, RSVPs and admin tools. No phone numbers exchanged.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    'run clubs in India',
    'run clubs Noida',
    'run clubs Delhi',
    'run clubs Bengaluru',
    'run clubs Mumbai',
    'running club platform',
    'manage run club',
    'run club discoverability',
    'run club privacy',
    'run club app',
    'list my run club online',
    'run club SEO',
    'Endorfin clubs',
    'free run club platform',
    'in-app club discussions',
    'RSVP run club',
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    type: 'website',
    url: PAGE_URL,
    title: 'Endorfin for Run Clubs — pitch deck',
    description: PAGE_DESCRIPTION,
    siteName: 'Endorfin',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Run Clubs in India — Free Platform for Founders',
    description:
      'Run your club. We’ll run the internet. SEO pages, private in-app chat, full admin controls. Free for clubs.',
    site: '@endorfinapp',
  },
  other: {
    'geo.region': 'IN',
  },
};

const FOUNDER_LINKEDIN = 'https://www.linkedin.com/in/shivam-singhal1/';

const SLIDES_TOTAL = 12;

const productJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Endorfin for Run Clubs',
  serviceType: 'Run club hosting, discoverability, and management platform',
  description:
    'A free platform for Indian run clubs: SEO-optimised club pages that rank on Google, in-app member discussions that protect phone numbers and emails, and a full admin surface for RSVPs, approvals, and recaps. Endorfin can also manage your club page on your behalf.',
  url: PAGE_URL,
  provider: {
    '@type': 'Organization',
    name: 'Endorfin',
    url: 'https://www.endorfin.run',
    logo: 'https://www.endorfin.run/icon.png',
    founder: {
      '@type': 'Person',
      name: 'Shivam Singhal',
      sameAs: [FOUNDER_LINKEDIN],
    },
  },
  areaServed: { '@type': 'Country', name: 'India' },
  audience: {
    '@type': 'PeopleAudience',
    audienceType: 'Run club founders and admins in India',
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'INR',
    availability: 'https://schema.org/InStock',
    description: 'Free forever for clubs.',
  },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Endorfin for Clubs — features',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'SEO-optimised club page',
          description:
            'Server-rendered, schema-tagged club page that ranks on Google for "run clubs in [city]" queries.',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Private in-app discussions',
          description:
            'Members-only club chat that lets founders stay reachable without sharing phone numbers or emails.',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Admin management surface',
          description:
            'Approve or reject join requests, create runs, manage RSVPs, post recaps, and edit club details.',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Concierge club setup',
          description:
            'Endorfin team can run your club page end-to-end — imports, recaps, photos. Free, limited capacity.',
        },
      },
    ],
  },
};

const personJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Shivam Singhal',
  jobTitle: 'Founder, Endorfin',
  description:
    'Engineer with 10+ years of experience. Built production stacks at Nykaa, INDmoney, and Virgin Hyperloop. A runner who has completed Pro Cam Slam, multiple Hyrox events, Yoddha races, and marathons across India.',
  url: 'https://www.endorfin.run',
  sameAs: [FOUNDER_LINKEDIN],
  worksFor: {
    '@type': 'Organization',
    name: 'Endorfin',
    url: 'https://www.endorfin.run',
  },
  knowsAbout: [
    'Software engineering',
    'Running',
    'Hyrox',
    'Marathon running',
    'Indian running community',
  ],
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://www.endorfin.run',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'For Run Clubs',
      item: PAGE_URL,
    },
  ],
};

export default function ClubPitchDeckPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="pd">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(personJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
        }}
      />

      {/* 01 · COVER */}
      <section className="slide" id="s1" aria-label="Cover">
        <div className="cover-bg" aria-hidden="true" />
        <div className="slide-num">01 / {SLIDES_TOTAL}</div>
        <div className="slide-inner">
          <span className="cover-eyebrow">For Run Club Founders · India</span>
          <h1 className="h-mega">
            Run your club.<br />
            We&rsquo;ll run<br />
            <em className="accent">the internet.</em>
            <span className="sr-only">
              {' '}— Endorfin is a free platform for run clubs in India: SEO-ranked club pages, private member chat, and full admin controls.
            </span>
          </h1>
          <div className="cover-meta">
            <div>
              <span className="meta">Pitch</span>
              <strong>Endorfin Clubs</strong>
            </div>
            <div>
              <span className="meta">Audience</span>
              <strong>Club founders &amp; admins</strong>
            </div>
            <div>
              <span className="meta">Built by</span>
              <strong>Shivam Singhal</strong>
            </div>
            <div>
              <span className="meta">Year</span>
              <strong>2026</strong>
            </div>
          </div>
        </div>
      </section>

      {/* 02 · THE REALITY */}
      <section className="slide" id="s2" aria-label="The reality of running a club today">
        <div className="slide-num">02 / {SLIDES_TOTAL}</div>
        <div className="slide-inner">
          <span className="kicker red">The Reality</span>
          <h2 className="h-display">
            You built a club.<br />
            The internet doesn&rsquo;t<br />
            <em className="accent">know it exists.</em>
          </h2>

          <div className="pain-list">
            <div className="pain-row">
              <span className="pain-num">01</span>
              <div className="pain-text">
                <strong>&ldquo;Run clubs in Noida&rdquo; → 0 results for you</strong>
                <span>
                  Hundreds of clubs, thousands of new runners — but Google can&rsquo;t find your group.
                  New runners join whichever club shows up first. That&rsquo;s almost never yours.
                </span>
              </div>
            </div>
            <div className="pain-row">
              <span className="pain-num">02</span>
              <div className="pain-text">
                <strong>Instagram DMs, where messages go to die</strong>
                <span>
                  &ldquo;Hey, can I join?&rdquo; lands in your Requests folder. By the time you see it,
                  they&rsquo;ve already joined someone else. No CTA, no funnel, no follow-up.
                </span>
              </div>
            </div>
            <div className="pain-row">
              <span className="pain-num">03</span>
              <div className="pain-text">
                <strong>WhatsApp = your number is now public</strong>
                <span>
                  Members hand over their phone numbers to join a group. Spam, creeps, unsolicited DMs.
                  Female runners drop out before the first run.
                </span>
              </div>
            </div>
            <div className="pain-row">
              <span className="pain-num">04</span>
              <div className="pain-text">
                <strong>Manual everything — RSVPs, headcounts, recaps</strong>
                <span>
                  Polls in WhatsApp. Spreadsheets nobody reads. Recap photos lost in 600-message threads.
                  Founder fatigue is the #1 reason clubs die.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 03 · THE COST */}
      <section className="slide" id="s3" aria-label="What invisibility costs">
        <div className="slide-num">03 / {SLIDES_TOTAL}</div>
        <div className="slide-inner">
          <span className="kicker">The Cost</span>
          <h2 className="h-display">
            Invisible clubs<br />
            <em className="accent">don&rsquo;t grow.</em>
          </h2>
          <p className="lead" style={{ marginTop: 24 }}>
            Every Sunday morning, runners are searching for a community in your city. They never find you.
          </p>

          <div className="grid-3" style={{ marginTop: 56 }}>
            <div className="cost-stat">
              <span className="num">~80%</span>
              <span className="label">of new runners</span>
              <p>Find their first club via Google or Instagram search — not word of mouth. If you don&rsquo;t rank, you don&rsquo;t exist.</p>
            </div>
            <div className="cost-stat">
              <span className="num">10+</span>
              <span className="label">hours / week</span>
              <p>Founders spend on admin: replying to DMs, managing RSVPs, chasing photos, copy-pasting Strava splits. All unpaid.</p>
            </div>
            <div className="cost-stat">
              <span className="num">3 in 5</span>
              <span className="label">drop off in 30 days</span>
              <p>New members never make it past the first WhatsApp group ping. No structured intro. No second-touch. Gone.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 04 · THE SHIFT */}
      <section className="slide slide-bone" id="s4" aria-label="The shift in Indian running">
        <div className="slide-num">04 / {SLIDES_TOTAL}</div>
        <div className="slide-inner">
          <span className="kicker red">The Shift</span>
          <h2 className="h-display">
            India is running.<br />
            The tools <em className="accent">aren&rsquo;t keeping up.</em>
          </h2>

          <div className="grid-2" style={{ marginTop: 64 }}>
            <div>
              <p className="lead" style={{ color: 'rgba(10,10,10,0.72)', fontSize: 18 }}>
                Marathons sold out in minutes. Sub-3 hour finishers everywhere. Brunch runs, sunrise runs,
                Sunday long runs — every neighbourhood has a group now.
              </p>
              <p className="lead" style={{ color: 'rgba(10,10,10,0.72)', fontSize: 18, marginTop: 20 }}>
                But the infrastructure is <strong>WhatsApp + Instagram</strong>. Built for memes, not communities.
                Built for chats, not clubs.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <ShiftStat value="2.1M+" label="Marathon registrations · India · 2025" />
              <ShiftStat value="600+" label="Run clubs in major Indian metros" />
              <ShiftStat value="0" label="Built specifically for them. Until now." />
            </div>
          </div>
        </div>
      </section>

      {/* 05 · THREE PILLARS */}
      <section className="slide" id="s5" aria-label="Three pillars: discoverability, privacy, manageability">
        <div className="slide-num">05 / {SLIDES_TOTAL}</div>
        <div className="slide-inner">
          <span className="kicker red">Endorfin for Clubs</span>
          <h2 className="h-display">
            A real home<br />
            for your <em className="accent">running community.</em>
          </h2>
          <p className="lead" style={{ marginTop: 24 }}>
            Three things you need. Three things WhatsApp + Instagram can&rsquo;t give you.
          </p>

          <div className="pillars">
            <div className="pillar">
              <span className="tag">01 · Discoverability</span>
              <h3 className="h3">Show up first when runners search.</h3>
              <p>
                A dedicated club page that ranks on Google. Schema-tagged for &ldquo;Run clubs in Noida&rdquo;.
                Share-ready. Bot-friendly.
              </p>
            </div>
            <div className="pillar">
              <span className="tag">02 · Privacy</span>
              <h3 className="h3">Talk to your club without handing out your number.</h3>
              <p>
                Every conversation lives in-app. No phone, no email, no DM creeps. Members reach you through
                structured channels.
              </p>
            </div>
            <div className="pillar">
              <span className="tag">03 · Manageability</span>
              <h3 className="h3">Run the club from one screen.</h3>
              <p>
                Approvals, RSVPs, recaps, logos, descriptions — all in-app. Or hand it to us, and we&rsquo;ll
                manage your runs for free.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 06 · DISCOVERABILITY */}
      <section className="slide" id="s6" aria-label="Discoverability deep dive">
        <div className="slide-num">06 / {SLIDES_TOTAL}</div>
        <div className="slide-inner">
          <span className="kicker red">01 · Discoverability</span>
          <h2 className="h2" style={{ maxWidth: '18ch' }}>Your club, on page one.</h2>
          <p className="lead" style={{ marginTop: 20 }}>
            Server-rendered, schema-marked, and structured for Google. Every club page is a long-lived SEO
            asset working for you 24/7.
          </p>

          <div style={{ marginTop: 56 }}>
            <div className="browser">
              <div className="browser-bar">
                <span className="dot" /><span className="dot" /><span className="dot" />
                <span className="url">
                  <span className="lock">🔒</span>google.com<span className="path">/search?q=run+clubs+in+noida</span>
                </span>
              </div>
              <div className="serp">
                <div className="serp-q">
                  <span className="magnify" aria-hidden>🔍</span>
                  run clubs in noida
                </div>

                <a href="/clubs" className="serp-result featured" aria-label="Browse run clubs on Endorfin">
                  <span className="serp-rank">▸ Rank #1 · with Endorfin</span>
                  <div className="serp-bread">endorfin.run › clubs</div>
                  <div className="serp-title">Run clubs in India — discover, RSVP, join · Endorfin</div>
                  <div className="serp-snippet">
                    Members · runs this month · km logged · founding year. Join the next run, RSVP, see the
                    last run recap. Verified clubs on Endorfin.
                  </div>
                </a>

                <div className="serp-result">
                  <div className="serp-bread">instagram.com › someclub</div>
                  <div className="serp-title">@someclub_run • Instagram profile</div>
                  <div className="serp-snippet">A page with no posts in the last 6 months. No address. No CTA. No structure.</div>
                </div>

                <div className="serp-result">
                  <div className="serp-bread">reddit.com › r/IndiaRunning</div>
                  <div className="serp-title">Best run clubs in Noida? : IndiaRunning</div>
                  <div className="serp-snippet">&ldquo;Idk anyone tried xyz?&rdquo; — 3 comments, 2 years ago.</div>
                </div>
              </div>
            </div>

            <div className="grid-3" style={{ marginTop: 40 }}>
              <div>
                <div className="meta">SEO mechanics</div>
                <p style={{ margin: '8px 0 0', fontSize: 14.5, color: 'var(--pd-bone-dim)', lineHeight: 1.55 }}>
                  Server-rendered Next.js. JSON-LD <code className="mono" style={{ color: 'var(--pd-bone)' }}>SportsClub</code> schema.
                  Sitemap inclusion. OG images per club.
                </p>
              </div>
              <div>
                <div className="meta">Built-in CTAs</div>
                <p style={{ margin: '8px 0 0', fontSize: 14.5, color: 'var(--pd-bone-dim)', lineHeight: 1.55 }}>
                  Join button. RSVP button. Pinned next run. App download. Every visitor has a clear next step.
                </p>
              </div>
              <div>
                <div className="meta">Always on</div>
                <p style={{ margin: '8px 0 0', fontSize: 14.5, color: 'var(--pd-bone-dim)', lineHeight: 1.55 }}>
                  Stats refresh automatically. Recap videos auto-pinned. Your page never goes stale, even if you do.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 07 · PRIVACY */}
      <section className="slide" id="s7" aria-label="Privacy deep dive">
        <div className="slide-num">07 / {SLIDES_TOTAL}</div>
        <div className="slide-inner">
          <span className="kicker red">02 · Privacy</span>
          <div className="grid-2" style={{ gap: 80 }}>
            <div>
              <h2 className="h2" style={{ maxWidth: '16ch' }}>
                No phone.<br />
                No email.<br />
                <em className="accent">No creeps.</em>
              </h2>
              <p className="lead" style={{ marginTop: 24 }}>
                Every member-to-member and member-to-founder conversation lives inside Endorfin. Phone numbers
                stay yours. Emails stay yours. Discussions stay structured.
              </p>

              <div className="privacy-badges">
                <PrivacyBadge
                  title="Founders are reachable, not exposed"
                  body="Members can DM you in-app, RSVP your runs, and post in club discussions — without ever getting your number."
                />
                <PrivacyBadge
                  title="Members-only club discussions"
                  body="Threads gated to approved members. Read & write access tied to membership. Leave the club, lose the access."
                />
                <PrivacyBadge
                  title="Structured join requests"
                  body="Custom join form per club. You decide what you want to know. You approve or reject — same as Strava clubs, but without giving up your number."
                />
                <PrivacyBadge
                  title="Female-runner-friendly by default"
                  body="The single biggest blocker to joining a WhatsApp group is gone. More women join. More women stay."
                />
              </div>
            </div>

            <div>
              <div className="phone" role="img" aria-label="In-app club discussion mockup">
                <div className="phone-screen">
                  <div className="phone-bar">
                    <span>9:41</span>
                    <span>UpRun · Discussion</span>
                    <span>●●●</span>
                  </div>
                  <div className="phone-h">UpRun Club</div>
                  <div className="phone-sub">Members-only discussion · 42 members</div>

                  <div className="msg" style={{ marginTop: 12 }}>
                    <div className="msg-author">Aisha · Founder</div>
                    Sunday&rsquo;s run is moved to 6:30 AM. Bring your reflective gear, kids — pre-dawn vibes ☀️
                  </div>
                  <div className="msg me">
                    <div className="msg-author">Me</div>
                    Counted in! 5K or 10K loop?
                  </div>
                  <div className="msg">
                    <div className="msg-author">Aisha · Founder</div>
                    Both. RSVP in the event card 👇
                  </div>
                  <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, height: 38, border: '1px solid var(--pd-bone-hairline)', borderRadius: 10, padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: 12, color: 'var(--pd-bone-faint)' }}>
                      Type a message…
                    </div>
                    <div style={{ width: 38, height: 38, background: 'var(--pd-signal)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }} aria-hidden>↑</div>
                  </div>
                </div>
              </div>
              <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--pd-bone-faint)', fontFamily: 'var(--font-jetbrains-mono), monospace', letterSpacing: '0.06em' }}>
                In-app discussion · no phone numbers exchanged
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 08 · MANAGEABILITY */}
      <section className="slide" id="s8" aria-label="Manageability deep dive">
        <div className="slide-num">08 / {SLIDES_TOTAL}</div>
        <div className="slide-inner">
          <span className="kicker red">03 · Manageability</span>
          <h2 className="h-display" style={{ maxWidth: '18ch' }}>
            Run the club.<br />
            Or let <em className="accent">us run it for you.</em>
          </h2>

          <div className="manage-grid" style={{ marginTop: 64 }}>
            <div className="feature-list">
              <FeatureRow letter="A" title="Approve or reject join requests" body="Custom join form. In-app + email approvals. One tap." />
              <FeatureRow letter="B" title="Create runs & community events" body="Set distance, route, time. Members RSVP. Headcount auto-tracked." />
              <FeatureRow letter="C" title="Last run recap — photos & video reel" body="Post-run, drop your clips. Recap auto-pins on the public club page." />
              <FeatureRow letter="D" title="Edit everything — logo, niche, description" body="Serious / chill / community-building. Tag your vibe. Refresh anytime." />
              <FeatureRow letter="E" title="Member directory & admin roles" body="Promote co-admins. Remove inactive members. Member counts live." />
              <FeatureRow letter="F" title="Push notifications when stuff happens" body="New join request, new RSVP, new discussion message — all routed." />
            </div>

            <div className="free-card">
              <span className="tag">Concierge option</span>
              <h3 className="h2" style={{ fontSize: 36, lineHeight: 1.05 }}>
                Don&rsquo;t want to manage it?<br />
                <em className="accent">We will. For free.</em>
              </h3>
              <p>
                Our team can run your club page end-to-end — pull your last runs, write the recaps, format the
                events, post the photos. You keep showing up to the run.
              </p>
              <p style={{ fontSize: 12.5, color: 'var(--pd-bone-faint)' }}>
                Limited capacity. First 50 clubs onboarded.
              </p>
              <a href="#s12" className="btn">Apply for managed setup →</a>
            </div>
          </div>
        </div>
      </section>

      {/* 09 · MEMBER XP */}
      <section className="slide" id="s9" aria-label="What members see">
        <div className="slide-num">09 / {SLIDES_TOTAL}</div>
        <div className="slide-inner">
          <span className="kicker red">For your members</span>
          <h2 className="h-display" style={{ maxWidth: '22ch' }}>
            A real club page.<br />
            Not a <em className="accent">link in bio.</em>
          </h2>
          <p className="lead" style={{ marginTop: 24 }}>
            When someone discovers your club, they don&rsquo;t land on a profile picture and a DM button. They
            land on this:
          </p>

          <div className="grid-3" style={{ marginTop: 56 }}>
            <div className="xp-card">
              <span className="label">Next Run</span>
              <span className="title">All Women Mother&rsquo;s Day Run.</span>
              <span className="meta-line">Sun, 10 May · 8:00 AM · Habidade, Sector 104</span>
              <div className="xp-stats">
                <div><strong>5K</strong>Distance</div>
                <div><strong>+1 free</strong>Mom entry</div>
              </div>
              <div className="cta">RSVP — I&rsquo;m in</div>
            </div>
            <div className="xp-card">
              <span className="label">Club</span>
              <span className="title">UpRun Club — verified.</span>
              <span className="meta-line">Sunday morning crew · Noida · since 2022</span>
              <div className="xp-stats">
                <div><strong>42</strong>Members</div>
                <div><strong>312</strong>KM this month</div>
                <div><strong>8</strong>Runs / month</div>
                <div><strong>3 yrs</strong>Running</div>
              </div>
              <div className="cta">Request to join</div>
            </div>
            <div className="xp-card">
              <span className="label">Last Run · Recap</span>
              <span className="title">Sunrise loop, Sector 56.</span>
              <span className="meta-line">38 went · 6:00 AM · 10K · brunch after</span>
              <div style={{ aspectRatio: '1', borderRadius: 12, background: 'linear-gradient(135deg, rgba(230,35,42,0.15), rgba(245,240,235,0.04))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pd-bone-faint)', fontSize: 11, letterSpacing: '0.16em', fontFamily: 'var(--font-oswald)', textTransform: 'uppercase' }}>
                ▶ Recap reel
              </div>
              <div className="cta">See full recap</div>
            </div>
          </div>

          <p className="lead" style={{ marginTop: 56, maxWidth: '64ch', color: 'var(--pd-bone-faint)', fontSize: 15 }}>
            Same club. Same Sunday run. But now: <strong style={{ color: 'var(--pd-bone)' }}>discoverable, joinable, RSVP-able, recap-able</strong> — without you doing extra work.
          </p>
        </div>
      </section>

      {/* 10 · FOUNDER */}
      <section className="slide slide-bone" id="s10" aria-label="About the founder">
        <div className="slide-num">10 / {SLIDES_TOTAL}</div>
        <div className="slide-inner">
          <span className="kicker red">Built by a runner who ships</span>
          <h2 className="h-display">
            Endorfin is built by someone<br />
            who ships <em className="accent">production stacks</em><br />
            <em className="accent">and runs the events.</em>
          </h2>

          <div className="grid-2" style={{ marginTop: 64 }}>
            <div>
              <p className="lead" style={{ color: 'rgba(10,10,10,0.72)', fontSize: 18 }}>
                I&rsquo;m Shivam. 10+ years of engineering, 4 production stacks built from zero. I&rsquo;ve
                shipped to crores of users at <strong>Nykaa</strong>, <strong>INDmoney</strong>, and{' '}
                <strong>Virgin Hyperloop</strong>.
              </p>
              <p className="lead" style={{ color: 'rgba(10,10,10,0.72)', fontSize: 18, marginTop: 20 }}>
                But I&rsquo;m not just another techie behind a laptop. I&rsquo;m a runner — the kind that flies
                across India to chase finish lines.
              </p>

              <div className="race-strip">
                <span className="race-label">On the start line</span>
                <ul>
                  <li>Pro Cam Slam — completed</li>
                  <li>Hyrox — multiple events</li>
                  <li>Yoddha races — multi-time</li>
                  <li>Marathons across India</li>
                </ul>
              </div>

              <p style={{ marginTop: 32, padding: 24, borderLeft: '3px solid var(--pd-signal)', color: 'rgba(10,10,10,0.85)', fontFamily: 'var(--font-fraunces), serif', fontStyle: 'italic', fontSize: 22, lineHeight: 1.4 }}>
                &ldquo;I built Endorfin because I&rsquo;ve felt every one of these problems myself —
                as a runner, as a club member, and as a founder helping run organisers.&rdquo;
              </p>

              <a
                href={FOUNDER_LINKEDIN}
                className="linkedin-link"
                target="_blank"
                rel="noopener noreferrer me"
              >
                <span aria-hidden>in</span> Connect on LinkedIn →
              </a>
            </div>

            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="logo-tile">
                  Nykaa
                  <em>Built core stack from scratch · Prev.</em>
                </div>
                <div className="logo-tile">
                  INDmoney
                  <em>Foundational engineering · Prev.</em>
                </div>
                <div className="logo-tile">
                  Virgin Hyperloop
                  <em>Engineering · Prev.</em>
                </div>
                <div className="logo-tile signal">
                  Endorfin
                  <em>Founder · 2025–</em>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11 · PRICING */}
      <section className="slide" id="s11" aria-label="Pricing">
        <div className="slide-num">11 / {SLIDES_TOTAL}</div>
        <div className="slide-inner">
          <span className="kicker red" style={{ display: 'flex', justifyContent: 'center' }}>Pricing</span>
          <div className="free-hero">
            <h2 className="price">
              It&rsquo;s <em>free.</em>
            </h2>
            <p className="sub">
              Forever, for clubs. We don&rsquo;t charge admins. We don&rsquo;t charge members. We don&rsquo;t
              charge per run.
            </p>
          </div>

          <div className="why-free">
            <div>
              <strong>Why free for you</strong>
              <p>Clubs are the heartbeat of running in India. Charging founders to organise their own community would be insane.</p>
            </div>
            <div>
              <strong>How we make money</strong>
              <p>We monetise through running events (registrations, ticketing) and brand partnerships — not by taxing communities.</p>
            </div>
            <div>
              <strong>What you commit</strong>
              <p>Show up. Run with your club. Keep the page alive. That&rsquo;s it. No contract. No exclusivity.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 12 · CTA */}
      <section className="slide" id="s12" aria-label="Get started">
        <div className="cover-bg" aria-hidden="true" />
        <div className="slide-num">12 / {SLIDES_TOTAL}</div>
        <div className="slide-inner">
          <div className="cta-final">
            <span className="kicker red" style={{ display: 'inline-flex', justifyContent: 'center' }}>
              Get started
            </span>
            <h2 className="h-mega" style={{ fontSize: 'clamp(64px, 12vw, 160px)' }}>
              Get your club<br />
              on <em className="accent">Endorfin.</em>
            </h2>
            <p className="lead" style={{ margin: '32px auto 0', fontSize: 19 }}>
              Onboarding takes 30 seconds — we already have all the details about your club. Or hand it over and
              we&rsquo;ll set up your page, write your first recap, and import your last run.
            </p>

            <div className="cta-actions">
              <a href="https://www.endorfin.run/clubs" className="btn">
                Start free → onboard your club
              </a>
              <a href="mailto:hello@endorfin.run" className="btn btn-ghost">Talk to founder</a>
            </div>

            <div className="cta-meta">
              <div><span className="meta">Web</span><br /><strong>endorfin.run/clubs</strong></div>
              <div><span className="meta">Email</span><br /><strong>hello@endorfin.run</strong></div>
              <div><span className="meta">Founder</span><br /><strong>Shivam Singhal</strong></div>
              <div><span className="meta">App</span><br /><strong>iOS · Android</strong></div>
            </div>

            <nav className="footer-nav" aria-label="More on Endorfin">
              <a href="/clubs">Browse run clubs</a>
              <span aria-hidden="true">·</span>
              <a href="/running-events">Running events in India</a>
              <span aria-hidden="true">·</span>
              <a href="/coaches">Running coaches</a>
              <span aria-hidden="true">·</span>
              <a href="/runners">Runners</a>
              <span aria-hidden="true">·</span>
              <a href="/workout-plan">Kip — training plans</a>
            </nav>
          </div>
        </div>
      </section>

        <nav className="deck-progress" aria-label="Slide navigation">
          {Array.from({ length: SLIDES_TOTAL }, (_, i) => i + 1).map((n) => (
            <a key={n} href={`#s${n}`} title={`Slide ${n}`} aria-label={`Go to slide ${n}`} />
          ))}
        </nav>

        <NextButton />
      </main>
      <Footer />
    </>
  );
}

function ShiftStat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ padding: 28, border: '1px solid rgba(10,10,10,0.12)', borderRadius: 16 }}>
      <div style={{ fontFamily: 'var(--font-fraunces), serif', fontStyle: 'italic', fontWeight: 700, fontSize: 56, lineHeight: 1, color: 'var(--pd-signal)' }}>
        {value}
      </div>
      <div style={{ fontFamily: 'var(--font-oswald), sans-serif', fontWeight: 500, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.55)', marginTop: 8 }}>
        {label}
      </div>
    </div>
  );
}

function PrivacyBadge({ title, body }: { title: string; body: string }) {
  return (
    <div className="privacy-badge">
      <div className="check" aria-hidden>✓</div>
      <div>
        <strong>{title}</strong>
        <span>{body}</span>
      </div>
    </div>
  );
}

function FeatureRow({
  letter,
  title,
  body,
}: {
  letter: string;
  title: string;
  body: string;
}) {
  return (
    <div className="feature-row">
      <div className="icon">{letter}</div>
      <div>
        <strong>{title}</strong>
        <span>{body}</span>
      </div>
      <div className="pill live">Live</div>
    </div>
  );
}
