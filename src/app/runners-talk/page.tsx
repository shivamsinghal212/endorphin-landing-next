import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { TalkCard } from '@/components/TalkCoverBand';
import TalkContribute from '@/components/TalkContribute';
import { STATIONS, TALK_NAME, TALK_PATH, fetchTalkPosts, talkUrl } from '@/lib/talk';
import './talk.css';

const SITE = 'https://www.endorfin.run';
const DESCRIPTION =
  'Injury prevention, training methods and strength drills for runners, written by physiotherapists, coaches and runners in the Endorfin community.';

export const metadata: Metadata = {
  title: `${TALK_NAME}: Running Injury, Training & Strength Advice`,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE}${TALK_PATH}` },
  openGraph: { type: 'website', url: `${SITE}${TALK_PATH}`, title: TALK_NAME, description: DESCRIPTION, siteName: 'Endorfin', locale: 'en_IN' },
};

export default async function TalkHub() {
  const posts = await fetchTalkPosts();
  // Only stations that have something in them — no empty shelves.
  const stations = STATIONS.map((s) => ({ ...s, posts: posts.filter((p) => p.station === s.key) })).filter(
    (s) => s.posts.length,
  );

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: TALK_NAME,
    description: DESCRIPTION,
    url: `${SITE}${TALK_PATH}`,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: posts.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `${SITE}${talkUrl(p.slug)}`,
        name: p.title,
      })),
    },
  };

  return (
    <main id="main-content" className="overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <div className="rt">
        <header className="rt-hub-head">
          <span className="rt-ghost" aria-hidden="true">TALK</span>
          <div className="container"><div className="rt-wrap" style={{ display: 'grid', gap: 14 }}>
            <span className="rt-eyebrow">{TALK_NAME}</span>
            <h1>The talk after <em className="rt-it">the run.</em></h1>
            <p>
              When someone says “my knee does this weird thing at 6 km”, the group has answers. These are
              those answers, from physios, coaches and runners, filed by the problem you have.
            </p>
            <a className="rt-contribute-link" href="#contribute">Want to contribute? Send us your article →</a>
          </div></div>
        </header>

        <div className="container"><div className="rt-wrap rt-hub-body">
          {stations.length === 0 ? (
            <p className="rt-empty" style={{ padding: '48px 0' }}>The first pieces are on their way.</p>
          ) : (
            stations.map((s) => (
              <section className="rt-station" id={s.key} key={s.key} aria-labelledby={`st-${s.key}`}>
                <div className="rt-station-head">
                  <h2 id={`st-${s.key}`}>{s.label}</h2>
                  <span>{s.blurb}</span>
                </div>
                <div className="rt-cards">
                  {s.posts.map((p) => <TalkCard key={p.id} post={p} />)}
                </div>
              </section>
            ))
          )}
          <TalkContribute />
        </div></div>
      </div>
      <Footer />
    </main>
  );
}
