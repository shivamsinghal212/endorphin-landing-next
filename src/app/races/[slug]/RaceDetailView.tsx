'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import posthog from 'posthog-js';
import CouponTopStrip from '@/components/CouponTopStrip';
import LoginModal from '@/components/LoginModal';
import RaceCouponContext from '@/components/RaceCouponContext';
import { couponCta } from '@/lib/coupon-cta';
import type { Event, DistanceCategory } from '@/lib/api';
import { useMyRegistrations } from '@/lib/runner-hooks';

// Pin to IST so SSR (UTC server) and the client (any TZ) render identical
// text — without an explicit timeZone, locale formatting uses the runtime's
// local zone, which causes a React #418 hydration mismatch for anyone
// outside the server's zone.
const IST = 'Asia/Kolkata';

function fmtFullDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: IST,
  });
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: IST,
  });
}

function fmtPrice(amount: number | null, currency: string | null) {
  if (amount == null) return null;
  const cur = currency || 'INR';
  if (cur === 'INR') return `₹${amount.toLocaleString('en-IN')}`;
  return `${cur} ${amount.toLocaleString('en')}`;
}

function distanceTags(event: Event): string[] {
  return event.distanceCategories
    .map((d) => d.fullTitle?.split('·')[0]?.trim() || d.categoryName)
    .filter(Boolean);
}

function hasAnyPrice(cats: DistanceCategory[]): boolean {
  return cats.some((d) => (d.discountedPrice ?? d.price) != null);
}

export default function RaceDetailView({
  event,
  isAuthed,
}: {
  event: Event;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [isFinalizingLogin, startLoginRefresh] = useTransition();
  // Pending registrationUrl to open in a new tab once the post-login
  // refresh commits — same popup-safe pattern as /races listing.
  const pendingUrlRef = useRef<string | null>(null);
  // Pending internal route to push (same tab) — used by the organiser
  // event Register CTA so the runner stays on-site through login.
  const pendingInternalPathRef = useRef<string | null>(null);
  const postLoginRef = useRef(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    posthog.capture('race_viewed', {
      race_id: event.id,
      race_slug: event.slug,
      race_title: event.title,
      race_location: event.locationName,
      has_coupon: event.hasCoupon,
      is_featured: event.isFeatured,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);
  const showCoupon = event.hasCoupon && event.couponDiscountPercent != null;
  const dateStr = fmtFullDate(event.startTime);
  const timeStr = fmtTime(event.startTime);
  const priceStr = fmtPrice(event.priceMin, event.currency) || 'Free';

  // Detect whether the signed-in runner already has an active paid
  // registration for this event. We swap the Register CTA for a "You're
  // in" badge + bib, and surface the bib in the "Registered" meta cell.
  // The hook returns `undefined` for anonymous visitors (no RunnerProviders),
  // which keeps this a no-op for the public path.
  const myRegsQ = useMyRegistrations();
  const myActiveRegistration = isAuthed
    ? myRegsQ.data?.items.find(
        (r) =>
          r.eventId === event.id &&
          r.registrationStatus !== 'cancelled' &&
          (r.paymentStatus === 'paid' || r.paymentStatus === 'free'),
      )
    : undefined;
  const isAlreadyRegistered = !!myActiveRegistration;
  const tags = distanceTags(event);
  const mapUrl =
    event.latitude != null && event.longitude != null
      ? `https://maps.google.com/?q=${event.latitude},${event.longitude}`
      : null;

  const cta = couponCta(event);
  const heroCtaLabel = showCoupon
    ? cta.intent === 'login'
      ? `Register at ${event.couponDiscountPercent}% off`
      : event.couponCode
        ? 'Register ↗'
        : 'Register ↗'
    : 'Register ↗';

  // Auth-gate Register clicks. Same rule as the /races listing:
  //   intent === 'login'                              → always modal (anon + coupon)
  //   intent === 'register' && !isAuthed              → modal, stash URL for post-login open
  //   anything else                                   → let the <a target="_blank"> run
  const handleRegisterClick = useCallback(
    (e: React.MouseEvent) => {
      posthog.capture('race_register_clicked', {
        race_id: event.id,
        race_slug: event.slug,
        race_title: event.title,
        race_location: event.locationName,
        has_coupon: event.hasCoupon,
        source: 'detail',
      });
      if (cta.intent === 'login') {
        e.preventDefault();
        pendingUrlRef.current = null;
        setLoginOpen(true);
        return;
      }
      if (cta.intent === 'register' && !isAuthed) {
        e.preventDefault();
        pendingUrlRef.current = event.registrationUrl ?? null;
        setLoginOpen(true);
      }
    },
    [cta.intent, isAuthed, event.registrationUrl, event.id, event.slug, event.title, event.locationName, event.hasCoupon],
  );

  const handleLoginSuccess = useCallback(() => {
    postLoginRef.current = true;
    // Refresh wrapped in startTransition so the modal can show a loader
    // until the server re-renders with the auth cookie attached.
    startLoginRefresh(() => {
      router.refresh();
    });
  }, [router]);

  // Once the post-login refresh commits, close the modal and either
  // navigate to the stashed internal path (same tab) or pop the
  // external URL in a new tab — staying close to the original click
  // gesture keeps most popup blockers happy.
  useEffect(() => {
    if (!isFinalizingLogin && postLoginRef.current) {
      postLoginRef.current = false;
      const internal = pendingInternalPathRef.current;
      const external = pendingUrlRef.current;
      pendingInternalPathRef.current = null;
      pendingUrlRef.current = null;
      setLoginOpen(false);
      if (internal) {
        router.push(internal);
      } else if (external) {
        window.open(external, '_blank', 'noopener,noreferrer');
      }
    }
  }, [isFinalizingLogin, router]);

  return (
    <div className="v1rd-page">
      {showCoupon && (
        <CouponTopStrip
          couponCode={event.couponCode ?? null}
          couponDiscountPercent={event.couponDiscountPercent ?? null}
          hasCoupon={true}
          size="md"
          className="v1rd-top-strip"
        />
      )}

      {/* Crumb removed on detail page — the page title is right below and
          the back/Races nav is in the header. Keeps the discount strip
          flush with the page top. */}

      <section className="v1rd-hero">
        <div className="v1rd-container">
          {tags.length > 0 && (
            <div className="v1rd-tags">
              {tags.map((t, i) => (
                <span key={t + i} className={`v1rd-tag ${i === 0 ? 'is-red' : ''}`}>{t}</span>
              ))}
              {event.isFeatured && <span className="v1rd-tag is-amber">★ Endorfin pick</span>}
            </div>
          )}
          <h1 className="v1rd-title">{event.title}</h1>
          {event.organizerName && (
            <p className="v1rd-byline">
              By <strong>{event.organizerName}</strong>
              {event.eventType ? ` · ${event.eventType.replace('_', ' ')}` : ''}
            </p>
          )}

          <div className="v1rd-meta-strip">
            <div className="v1rd-ms-cell">
              <div className="v1rd-l">Race day</div>
              <div className="v1rd-v">
                {dateStr}
                <small>{timeStr}</small>
              </div>
            </div>
            <div className="v1rd-ms-cell">
              <div className="v1rd-l">Where</div>
              <div className="v1rd-v">
                {event.locationName || '—'}
                {event.latitude != null && event.longitude != null && (
                  <small>
                    {event.latitude.toFixed(2)}, {event.longitude.toFixed(2)}
                  </small>
                )}
              </div>
            </div>
            <div className="v1rd-ms-cell">
              <div className="v1rd-l">From</div>
              <div className="v1rd-v">
                {priceStr}
                {event.distanceCategories.length > 0 && (
                  <small>
                    {event.distanceCategories.length}{' '}
                    {event.distanceCategories.length === 1 ? 'category' : 'categories'}
                  </small>
                )}
              </div>
            </div>
            <div className="v1rd-ms-cell">
              <div className="v1rd-l">
                {isAlreadyRegistered ? 'Your bib' : event.goingCount > 0 ? 'Going' : 'Registered'}
              </div>
              <div className="v1rd-v">
                {isAlreadyRegistered ? (
                  <>
                    {myActiveRegistration!.bibNumber ?? '—'}
                    <small>You’re in</small>
                  </>
                ) : event.goingCount > 0 ? (
                  <>
                    {event.goingCount} {event.goingCount === 1 ? 'runner' : 'runners'}
                    {event.totalTicketsSold != null && event.totalTicketsSold > 0 && (
                      <small>+ {event.totalTicketsSold.toLocaleString('en-IN')} registered</small>
                    )}
                  </>
                ) : event.totalTicketsSold != null && event.totalTicketsSold > 0 ? (
                  <>{event.totalTicketsSold.toLocaleString('en-IN')}</>
                ) : (
                  <>—</>
                )}
              </div>
            </div>
          </div>

          <div className="v1rd-cta-row">
            {isAlreadyRegistered ? (
              // Mini-bib chip — visually mirrors the full bib card.
              // Red header band reading "YOU'RE IN" + bone body with the
              // bib number, wrapped by the same 2px jet border the full
              // bib carries. Click → opens the full bib + share view.
              <Link
                href={`/races/${event.slug || event.id}/register`}
                className="group inline-flex items-stretch border-2 border-jet rounded-md overflow-hidden hover:shadow-[0_8px_24px_-12px_rgba(10,10,10,0.45)] transition-shadow no-underline"
                style={{ textDecoration: 'none' }}
              >
                <span className="bg-signal text-bone px-3 py-1 flex items-center">
                  <span className="font-display uppercase font-bold text-[10px] tracking-widest leading-none">
                    You’re in
                  </span>
                </span>
                <span className="bg-bone px-4 py-1.5 flex items-center gap-2">
                  <span className="font-display uppercase font-bold text-base text-jet leading-none tracking-tight">
                    {myActiveRegistration!.bibNumber ?? '—'}
                  </span>
                  <span className="text-jet/40 text-sm group-hover:text-jet group-hover:translate-x-0.5 transition-all">
                    →
                  </span>
                </span>
              </Link>
            ) : event.eventSourceType === 'organizer' ? (
              // Endorfin-hosted paid event — uses the internal /register
              // route. When the runner isn't signed in, we intercept the
              // click and open the login modal in-place so they don't
              // get bounced to homepage by the server-side auth redirect.
              <Link
                className="v1rd-btn v1rd-btn-primary"
                href={`/races/${event.slug || event.id}/register`}
                onClick={(e) => {
                  posthog.capture('race_register_clicked', {
                    race_id: event.id,
                    race_slug: event.slug,
                    race_title: event.title,
                    source: 'detail',
                  });
                  if (!isAuthed) {
                    e.preventDefault();
                    pendingInternalPathRef.current = `/races/${event.slug || event.id}/register`;
                    setLoginOpen(true);
                  }
                }}
              >
                Register →
              </Link>
            ) : event.registrationUrl ? (
              <a
                className="v1rd-btn v1rd-btn-primary"
                href={event.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleRegisterClick}
              >
                {heroCtaLabel}
              </a>
            ) : (
              <span className="v1rd-btn v1rd-btn-primary v1rd-disabled">Registration TBD</span>
            )}
            {event.registrationEndDate && (
              <span className="v1rd-cta-meta">
                Reg closes {fmtFullDate(event.registrationEndDate)}
              </span>
            )}
          </div>

          {event.imageUrl && (
            <div
              className="v1rd-hero-img"
              style={{ backgroundImage: `url('${event.imageUrl}')` }}
              aria-hidden
            />
          )}
        </div>
      </section>

      {(event.description || event.fullDescription) && (
        <section className="v1rd-block">
          <div className="v1rd-container">
            <div className="v1rd-block-h">
              <h2>About this race</h2>
              {event.source && (
                <span className="v1rd-block-meta">Source · {event.source}</span>
              )}
            </div>
            <div className="v1rd-prose">
              <ReactMarkdown>{event.description || ''}</ReactMarkdown>
            </div>
          </div>
        </section>
      )}

      {event.distanceCategories.length > 0 && (
        <section className="v1rd-block">
          <div className="v1rd-container">
            <div className="v1rd-block-h">
              <h2>Pick your distance</h2>
              <span className="v1rd-block-meta">
                {event.distanceCategories.length}{' '}
                {event.distanceCategories.length === 1 ? 'category' : 'categories'}
                {hasAnyPrice(event.distanceCategories) && event.currency
                  ? ` · prices in ${event.currency}`
                  : ''}
              </span>
            </div>
            {hasAnyPrice(event.distanceCategories) ? (
              <div className="v1rd-cat-rows">
                {event.distanceCategories.map((d, i) => {
                  const num = String(i + 1).padStart(2, '0');
                  const price = fmtPrice(d.discountedPrice ?? d.price, d.currency || event.currency);
                  const wasPrice =
                    d.discountedPrice != null && d.price != null && d.price !== d.discountedPrice
                      ? fmtPrice(d.price, d.currency || event.currency)
                      : null;
                  const hasMeta =
                    d.categoryStartTime || d.registrationEndDate || d.status;
                  return (
                    <div
                      key={d.id}
                      className={`v1rd-cat-row ${price ? '' : 'v1rd-cat-row-noprice'} ${hasMeta ? '' : 'v1rd-cat-row-nometa'}`}
                    >
                      <div className="v1rd-cat-num">{num}</div>
                      <div className="v1rd-cat-info">
                        <div className="v1rd-cat-name">{d.fullTitle || d.categoryName}</div>
                        {d.inclusions && d.inclusions.length > 0 && (
                          <div className="v1rd-cat-inclusions">
                            Includes: {d.inclusions.join(' · ')}
                          </div>
                        )}
                      </div>
                      {hasMeta && (
                        <div className="v1rd-cat-meta">
                          {d.categoryStartTime && (
                            <span>Flag-off · {fmtTime(d.categoryStartTime)}</span>
                          )}
                          {d.registrationEndDate && (
                            <span>
                              Reg closes{' '}
                              {new Date(d.registrationEndDate).toLocaleString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                timeZone: IST,
                              })}
                            </span>
                          )}
                          {d.status && <span className="v1rd-cat-status">{d.status}</span>}
                        </div>
                      )}
                      {price && (
                        <div className="v1rd-cat-price">
                          {price}
                          {wasPrice && <span className="v1rd-cat-was">{wasPrice}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <ul className="v1rd-cat-list">
                {event.distanceCategories.map((d, i) => (
                  <li key={d.id} className="v1rd-cat-list-item">
                    <span className="v1rd-cat-list-num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="v1rd-cat-list-name">{d.fullTitle || d.categoryName}</span>
                    {d.inclusions && d.inclusions.length > 0 && (
                      <span className="v1rd-cat-list-incl">{d.inclusions.join(' · ')}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {(event.venueName || event.locationName) && (
        <section className="v1rd-block">
          <div className="v1rd-container">
            <div className="v1rd-block-h">
              <h2>Event location</h2>
              {/* Eyebrow meta — coordinates for in-person events; suppressed
               *  for virtual to avoid duplicating "Virtual · run anywhere"
               *  in both the meta strip and the h3 below. */}
              {event.latitude != null && event.longitude != null && (
                <span className="v1rd-block-meta">
                  {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                </span>
              )}
            </div>
            <div className="v1rd-venue">
              <h3>{event.venueName || event.locationName}</h3>
              {event.locationAddress && <div className="v1rd-venue-addr">{event.locationAddress}</div>}
              {event.eventFormat === 'virtual' && !event.locationAddress && (
                <div className="v1rd-venue-addr">
                  Run any route, any time during the result window — track on Strava, Garmin, or the Endorfin app and submit your result.
                </div>
              )}
              {mapUrl && (
                <a className="v1rd-btn v1rd-btn-ghost" href={mapUrl} target="_blank" rel="noopener noreferrer">
                  Open in Google Maps ↗
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {event.organizerName && (
        <section className="v1rd-block">
          <div className="v1rd-container">
            <div className="v1rd-block-h">
              <h2>Organiser</h2>
              <span className="v1rd-block-meta">{event.organizerName}</span>
            </div>
            <div className="v1rd-org">
              <div className="v1rd-org-av">{event.organizerName.charAt(0).toUpperCase()}</div>
              <div>
                <div className="v1rd-org-name">{event.organizerName}</div>
                <div className="v1rd-org-meta">
                  {event.organizerEmail && (
                    <a href={`mailto:${event.organizerEmail}`}>{event.organizerEmail}</a>
                  )}
                  {event.organizerPhone && (
                    <>
                      {event.organizerEmail ? ' · ' : ''}
                      <a href={`tel:${event.organizerPhone}`}>{event.organizerPhone}</a>
                    </>
                  )}
                </div>
              </div>
              {event.website && (
                <a className="v1rd-btn v1rd-btn-ghost" href={event.website} target="_blank" rel="noopener noreferrer">
                  Website ↗
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {(event.refundPolicyMd || event.termsMd) && (
        <section className="v1rd-block">
          <div className="v1rd-container">
            <div className="v1rd-fineprint">
              {event.refundPolicyMd && (
                <details className="v1rd-disclosure">
                  <summary>
                    <span>Refund policy</span>
                    <span className="v1rd-disclosure-icon" aria-hidden>+</span>
                  </summary>
                  <div className="v1rd-prose v1rd-disclosure-body">
                    <ReactMarkdown>{event.refundPolicyMd}</ReactMarkdown>
                  </div>
                </details>
              )}
              {event.termsMd && (
                <details className="v1rd-disclosure">
                  <summary>
                    <span>Terms &amp; conditions</span>
                    <span className="v1rd-disclosure-icon" aria-hidden>+</span>
                  </summary>
                  <div className="v1rd-prose v1rd-disclosure-body">
                    <ReactMarkdown>{event.termsMd}</ReactMarkdown>
                  </div>
                </details>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="v1rd-end-cta">
        <div className="v1rd-container">
          <h2>
            Lock your <span className="v1rd-red">spot.</span>
          </h2>
          <p>
            {event.registrationEndDate
              ? `Registration closes ${fmtFullDate(event.registrationEndDate)}.`
              : 'Limited slots — secure your spot now.'}
          </p>
          <div className="v1rd-cta-row">
            {event.registrationUrl && (
              <a
                className="v1rd-btn v1rd-btn-primary"
                href={event.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleRegisterClick}
              >
                {heroCtaLabel}
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Mobile bottom stack — portaled to <body> so no ancestor containing
          block (transform/filter/overflow) can trap position:fixed.
          Order: coupon strip on top of register bar (visually). */}
      {mounted &&
        createPortal(
          <>
            {showCoupon && (
              <CouponTopStrip
                couponCode={event.couponCode ?? null}
                couponDiscountPercent={event.couponDiscountPercent ?? null}
                hasCoupon={true}
                size="md"
                className="v1rd-sticky-coupon"
              />
            )}
            <div className="v1rd-sticky-bar">
              <div className="v1rd-sticky-info">
                <div className="v1rd-sticky-price">
                  {priceStr}
                  <small> onwards</small>
                </div>
                {event.registrationEndDate ? (
                  <div className="v1rd-sticky-deadline">
                    Closes{' '}
                    {new Date(event.registrationEndDate).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      timeZone: IST,
                    })}
                  </div>
                ) : event.locationName ? (
                  <div className="v1rd-sticky-deadline">{event.locationName}</div>
                ) : null}
              </div>
              {isAlreadyRegistered ? (
                <Link
                  className="v1rd-sticky-cta"
                  href={`/races/${event.slug || event.id}/register`}
                  style={{ background: '#0A0A0A', color: '#F5F0EB' }}
                >
                  ✓ Bib {myActiveRegistration!.bibNumber ?? '—'}
                </Link>
              ) : event.eventSourceType === 'organizer' ? (
                <Link
                  className="v1rd-sticky-cta"
                  href={`/races/${event.slug || event.id}/register`}
                  onClick={(e) => {
                    if (!isAuthed) {
                      e.preventDefault();
                      pendingInternalPathRef.current = `/races/${event.slug || event.id}/register`;
                      setLoginOpen(true);
                    }
                  }}
                >
                  Register →
                </Link>
              ) : event.registrationUrl ? (
                <a
                  className="v1rd-sticky-cta"
                  href={event.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleRegisterClick}
                >
                  {heroCtaLabel}
                </a>
              ) : (
                <span className="v1rd-sticky-cta v1rd-sticky-cta-disabled">Registration TBD</span>
              )}
            </div>
          </>,
          document.body,
        )}

      <LoginModal
        open={loginOpen || isFinalizingLogin}
        onClose={() => setLoginOpen(false)}
        onSuccess={handleLoginSuccess}
        finalizing={isFinalizingLogin}
        context={<RaceCouponContext race={event} />}
        title={
          showCoupon ? (
            <>
              One tap to your <span className="v1lm-red">discount.</span>
            </>
          ) : (
            <>
              Sign in to <span className="v1lm-red">register.</span>
            </>
          )
        }
        subtitle={
          showCoupon
            ? 'Sign in to unlock your member discount.'
            : 'Sign in so we can save your registration and remind you on race day.'
        }
      />
    </div>
  );
}
