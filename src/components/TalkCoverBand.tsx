import Link from 'next/link';
import { STATIONS, TALK_NAME, TALK_PATH, stationLabel, talkUrl, type TalkPostSummary } from '@/lib/talk';
import '@/app/runners-talk/talk.css';

export function TalkCard({ post }: { post: TalkPostSummary }) {
  return (
    <Link className="rt-cover" href={talkUrl(post.slug)}>
      {post.hookText ? <span className="big">{post.hookText}</span> : <span className="rt-label">{stationLabel(post.station)}</span>}
      <b>{post.title}</b>
      {post.dek && <span className="dek">{post.dek.charAt(0).toUpperCase() + post.dek.slice(1)}.</span>}
      <span className="foot">
        <span>{post.authorName}</span>
        <span>{post.readingMinutes} min read →</span>
      </span>
    </Link>
  );
}

/** Homepage band: one cover story, not a card grid. Renders nothing until
 *  there's a published piece. */
export default function TalkCoverBand({ post }: { post: TalkPostSummary | null }) {
  if (!post) return null;
  return (
    <section className="rt rt-band" aria-labelledby="rt-band-title">
      <span className="rt-ghost" aria-hidden="true">TALK</span>
      <div className="container">
        <div className="rt-band-grid">
          <div>
            <span className="rt-eyebrow">{TALK_NAME}</span>
            <h2 id="rt-band-title">Run smarter. <em className="rt-it">Hurt less.</em></h2>
            <p>Injury, training and strength advice from physios, coaches and runners in the Endorfin community, filed by the problem you have.</p>
            <div className="rt-chips">
              {STATIONS.map((s) => (
                <Link key={s.key} className={`rt-chip${s.key === post.station ? ' is-red' : ''}`} href={`${TALK_PATH}#${s.key}`}>
                  {s.label}
                </Link>
              ))}
            </div>
            <Link className="rt-all" href={TALK_PATH}>Read {TALK_NAME} →</Link>
          </div>
          <TalkCard post={post} />
        </div>
      </div>
    </section>
  );
}
