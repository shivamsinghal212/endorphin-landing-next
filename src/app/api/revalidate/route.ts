import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';

// Auth-gated revalidation. The admin form pings this after a successful
// club save so the public /clubs/[slug] page refreshes instantly rather
// than waiting for the 60s ISR window to elapse.

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: { slug?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }

  const slug = body.slug?.trim();
  if (!slug) {
    return NextResponse.json({ ok: false, error: 'missing slug' }, { status: 400 });
  }

  revalidatePath(`/clubs/${slug}`);
  // Refresh the sitemap too so the new/updated club appears immediately.
  revalidatePath('/sitemap.xml');

  return NextResponse.json({ ok: true, revalidated: [`/clubs/${slug}`, '/sitemap.xml'] });
}
