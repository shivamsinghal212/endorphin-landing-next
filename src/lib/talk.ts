/** Runners' Talk — expert articles with high fives and notes. Public reads,
 *  cached for five minutes; writes go through `app/actions/talk.ts`. */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://api.endorfin.run';

export const TALK_PATH = '/runners-talk';
export const TALK_NAME = "Runners' Talk";

export type Station = 'injury' | 'training' | 'strength' | 'fuel';

export const STATIONS: { key: Station; label: string; blurb: string }[] = [
  { key: 'injury', label: 'Injury & Recovery', blurb: 'Aches, niggles and getting back out there.' },
  { key: 'training', label: 'Training', blurb: 'Plans, pacing and building up without breaking down.' },
  { key: 'strength', label: 'Strength & Drills', blurb: 'The work off the road that keeps you on it.' },
  { key: 'fuel', label: 'Fuel', blurb: 'Eating and drinking for the long run.' },
];

export const stationLabel = (s: string) => STATIONS.find((x) => x.key === s)?.label ?? s;

export interface TalkPostSummary {
  id: string;
  slug: string;
  title: string;
  dek: string | null;
  station: Station;
  tags: string[];
  hookText: string | null;
  coverImageUrl: string | null;
  authorName: string;
  authorRole: string | null;
  isCover: boolean;
  publishedAt: string | null;
  updatedAt: string | null;
  readingMinutes: number;
  highFives: number;
  notes: number;
}

export interface TalkPost extends TalkPostSummary {
  summaryPoints: string[];
  bodyMd: string;
  seoTitle: string | null;
  seoDescription: string | null;
  authorBio: string | null;
  authorCredentials: string[];
  authorUrl: string | null;
  authorImageUrl: string | null;
}

export interface TalkComment {
  id: string;
  parentId: string | null;
  body: string;
  runnerContext: string | null;
  createdAt: string | null;
  user: { id: string; name: string; pictureUrl: string | null };
  isAuthor: boolean;
}

export async function fetchTalkPosts(): Promise<TalkPostSummary[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/talk/posts`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchTalkPost(slug: string): Promise<TalkPost | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/talk/posts/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as TalkPost;
  } catch {
    return null;
  }
}

/** The homepage cover story: the flagged post, else the newest. */
export function pickCover(posts: TalkPostSummary[]): TalkPostSummary | null {
  return posts.find((p) => p.isCover) ?? posts[0] ?? null;
}

export const talkUrl = (slug: string) => `${TALK_PATH}/${slug}`;

export function initials(name: string): string {
  const words = name.replace(/^dr\.?\s+/i, '').split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'RT';
}

// ─── body parsing ──────────────────────────────────────────────────────
// Bodies are markdown plus two fenced callouts:
//   :::check Title   … :::   → a self-check drill card (list items starting ✓ / ✕)
//   :::stop Title    … :::   → the red "stop running" block
// `##` headings become the numbered checkpoints on the course rail.

export type BodySegment =
  | { kind: 'md'; md: string }
  | { kind: 'check' | 'stop'; title: string; md: string };

export function parseBody(md: string): BodySegment[] {
  const out: BodySegment[] = [];
  const re = /^:::(check|stop)[ \t]*(.*)\n([\s\S]*?)^:::[ \t]*$/gm;
  let last = 0;
  for (const m of md.matchAll(re)) {
    const before = md.slice(last, m.index).trim();
    if (before) out.push({ kind: 'md', md: before });
    out.push({ kind: m[1] as 'check' | 'stop', title: m[2].trim(), md: m[3].trim() });
    last = (m.index ?? 0) + m[0].length;
  }
  const rest = md.slice(last).trim();
  if (rest) out.push({ kind: 'md', md: rest });
  return out;
}

export function headingId(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** `##` headings in order — the checkpoints. Ignores headings inside callouts. */
export function checkpoints(md: string): { id: string; title: string }[] {
  return parseBody(md)
    .filter((s) => s.kind === 'md')
    .flatMap((s) => [...s.md.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim()))
    .map((title) => ({ id: headingId(title), title }));
}

/** Plain text for meta descriptions and llms.txt. */
export function plainText(md: string): string {
  return md
    .replace(/^:::.*$/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*_>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
