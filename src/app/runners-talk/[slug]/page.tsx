import { notFound } from 'next/navigation';
import { Fragment } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {
  TALK_NAME,
  TALK_PATH,
  checkpoints,
  fetchTalkPost,
  initials,
  plainText,
  stationLabel,
} from '@/lib/talk';
import TalkContribute from '@/components/TalkContribute';
import TalkBody from './TalkBody';
import TalkShell from './TalkShell';
import '../talk.css';

const SITE = 'https://www.endorfin.run';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchTalkPost(slug);
  if (!post) return { title: 'Not found', robots: { index: false, follow: false } };

  const url = `${SITE}${TALK_PATH}/${post.slug}`;
  const title = post.seoTitle || `${post.title}${post.dek ? `, ${post.dek}` : ''}`;
  const description = post.seoDescription || plainText(post.bodyMd).slice(0, 155);
  // og:image / twitter:image come from the sibling opengraph-image.tsx.
  return {
    title,
    description,
    alternates: { canonical: url },
    authors: [{ name: post.authorName, url: post.authorUrl ?? undefined }],
    robots: { index: true, follow: true, 'max-image-preview': 'large' },
    openGraph: {
      type: 'article',
      url,
      title,
      description,
      siteName: 'Endorfin',
      locale: 'en_IN',
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt ?? undefined,
      authors: [post.authorName],
      tags: post.tags,
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function fmtDate(iso: string | null) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
    .format(new Date(iso));
}

export default async function TalkPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await fetchTalkPost(slug);
  if (!post) notFound();

  const url = `${SITE}${TALK_PATH}/${post.slug}`;
  const cps = checkpoints(post.bodyMd);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      ...(post.dek && { alternativeHeadline: post.dek }),
      description: post.seoDescription || plainText(post.bodyMd).slice(0, 155),
      image: `${url}/opengraph-image`,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt || post.publishedAt,
      mainEntityOfPage: url,
      articleSection: stationLabel(post.station),
      keywords: post.tags.join(', '),
      author: {
        '@type': 'Person',
        name: post.authorName,
        ...(post.authorRole && { jobTitle: post.authorRole }),
        ...(post.authorBio && { description: post.authorBio }),
        ...(post.authorCredentials.length && { hasCredential: post.authorCredentials.map((c) => ({ '@type': 'EducationalOccupationalCredential', name: c })) }),
        ...(post.authorUrl && { url: post.authorUrl, sameAs: [post.authorUrl] }),
        ...(post.authorImageUrl && {
          image: post.authorImageUrl.startsWith('/') ? `${SITE}${post.authorImageUrl}` : post.authorImageUrl,
        }),
      },
      publisher: { '@type': 'Organization', name: 'Endorfin', url: SITE, logo: `${SITE}/icon.png` },
      interactionStatistic: {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: post.highFives,
      },
      commentCount: post.notes,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Endorfin', item: SITE },
        { '@type': 'ListItem', position: 2, name: TALK_NAME, item: `${SITE}${TALK_PATH}` },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    },
  ];

  const authorCard = (
    <section key="author" className="rt-authorcard" aria-labelledby="rt-author">
      <span className="rt-av" aria-hidden="true">
        {post.authorImageUrl ? <img src={post.authorImageUrl} alt="" /> : initials(post.authorName)}
      </span>
      <div>
        <span className="rt-label">About the author</span>
        <h2 id="rt-author">{post.authorName}</h2>
        {post.authorBio && <p>{post.authorBio}</p>}
        {post.authorCredentials.length > 0 && (
          <div className="rt-creds">
            {post.authorCredentials.map((c) => <span className="rt-chip" key={c}>{c}</span>)}
          </div>
        )}
        {post.authorUrl && (
          <a className="rt-btn is-solid" href={post.authorUrl} target="_blank" rel="noopener">
            Visit {new URL(post.authorUrl).hostname.replace(/^www\./, '')} ↗
          </a>
        )}
      </div>
    </section>
  );

  const next = (
    <Fragment key="next">
    <TalkContribute />
    <nav aria-label="Keep going">
      <span className="rt-label">Keep going</span>
      <div className="rt-next">
        <Link href="/running-events"><span>Running Events</span><b>Find your next race</b><span>Test it out on race day</span></Link>
        <Link href="/clubs"><span>Clubs</span><b>Run with a club near you</b><span>Strength sessions, long runs, all paces</span></Link>
        <Link href={TALK_PATH}><span>{TALK_NAME}</span><b>More from the talk</b><span>Injury, training, strength and fuel</span></Link>
      </div>
    </nav>
    </Fragment>
  );

  return (
    <main id="main-content" className="overflow-x-clip">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <article className="rt">
        <header className="rt-hero">
          <div className="container">
            {post.hookText && <span className="rt-ghost" aria-hidden="true">{post.hookText}</span>}
            <div className="rt-hero-inner">
              <div className="rt-crumbs">
                <Link className="rt-chip is-red" href={`${TALK_PATH}#${post.station}`}>{stationLabel(post.station)}</Link>
                {post.tags.map((t) => <span className="rt-chip" key={t}>{t}</span>)}
              </div>
              <h1>
                {post.title}
                {post.dek && <em className="rt-it">{post.dek}</em>}
              </h1>
              <div className="rt-byline">
                <span className="rt-av" aria-hidden="true">
                  {post.authorImageUrl ? <img src={post.authorImageUrl} alt="" /> : initials(post.authorName)}
                </span>
                <span className="who">
                  <b>{post.authorName}</b>
                  {post.authorRole && <span>{post.authorRole}</span>}
                </span>
                {post.authorCredentials.length > 0 && <span className="rt-verified">✓ Verified expert</span>}
                <span className="meta">
                  {post.readingMinutes} min read
                  {post.publishedAt && <> · <time dateTime={post.publishedAt}>{fmtDate(post.publishedAt)}</time></>}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="container">
          <TalkShell
            slug={post.slug}
            url={url}
            title={post.title}
            checkpoints={cps}
            initialHighFives={post.highFives}
            initialNotes={post.notes}
            authorCard={authorCard}
            next={next}
          >
            <Fragment key="body">
            {post.summaryPoints.length > 0 && (
              <section className="rt-tldr" aria-label="The 60-second version">
                <span className="rt-label">The 60-second version</span>
                <ul>{post.summaryPoints.map((p) => <li key={p}><span>{p}</span></li>)}</ul>
              </section>
            )}
            <TalkBody bodyMd={post.bodyMd} />
            </Fragment>
          </TalkShell>
        </div>
      </article>
      <Footer />
    </main>
  );
}
