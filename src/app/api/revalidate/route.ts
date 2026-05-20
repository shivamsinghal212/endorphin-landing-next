import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';

// Auth-gated revalidation.
//
// Existing use:
//   POST { slug }                  → revalidates /clubs/{slug} + sitemap (legacy clubs flow)
//
// New uses:
//   POST { entity: 'race', slug }  → revalidates /running-events + /running-events/{slug}
//   POST { entity: 'races' }       → revalidates /running-events listing only
//
// Admin can hit this after flipping is_featured / coupon fields so the
// public listing reflects the change immediately instead of waiting for
// the 60s ISR window.

interface Body {
  slug?: string;
  entity?: 'club' | 'race' | 'races';
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: Body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }

  const slug = body.slug?.trim();
  const entity = body.entity ?? 'club'; // legacy default

  const revalidated: string[] = [];

  if (entity === 'club') {
    if (!slug) {
      return NextResponse.json({ ok: false, error: 'missing slug' }, { status: 400 });
    }
    revalidatePath(`/clubs/${slug}`);
    revalidatePath('/sitemap.xml');
    revalidated.push(`/clubs/${slug}`, '/sitemap.xml');
  } else if (entity === 'race') {
    if (!slug) {
      return NextResponse.json({ ok: false, error: 'missing slug' }, { status: 400 });
    }
    revalidatePath('/running-events');
    revalidatePath(`/running-events/${slug}`);
    revalidated.push('/running-events', `/running-events/${slug}`);
  } else if (entity === 'races') {
    revalidatePath('/running-events');
    revalidated.push('/running-events');
  } else {
    return NextResponse.json({ ok: false, error: 'unknown entity' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, revalidated });
}
