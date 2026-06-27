'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import posthog from 'posthog-js';
import LoginModal from '@/components/LoginModal';
import RaceCouponContext from '@/components/RaceCouponContext';
import { ReminderButton } from '@/components/ReminderButton';
import CouponTopStrip from '@/components/CouponTopStrip';
import { couponCta } from '@/lib/coupon-cta';
import { eventPath } from '@/lib/event-path';
import { buildEventNarrative } from '@/lib/event-seo';
import { useMyRegistrations } from '@/lib/runner-hooks';
import type { DistanceCategory, Event } from '@/lib/api';

// Pin to IST so SSR (UTC) and client render identical text (avoids hydration
// mismatch). Mirrors RaceDetailView.
const IST = 'Asia/Kolkata';

function fmtFullDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: IST,
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST,
  });
}
function fmtPrice(amount: number | null, currency: string | null) {
  if (amount == null) return null;
  const cur = currency || 'INR';
  return cur === 'INR' ? `₹${amount.toLocaleString('en-IN')}` : `${cur} ${amount.toLocaleString('en')}`;
}
function hasAnyPrice(cats: DistanceCategory[]): boolean {
  return cats.some((d) => (d.discountedPrice ?? d.price) != null);
}
function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── tiny inline icons for the meta pills ──────────────────────────────────
const I = {
  cal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  tag: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" /><path d="M7 7h.01" /></svg>,
  ppl: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /></svg>,
};

export default function ExperienceDetailView({
  event,
  isAuthed,
  reminderIsSet,
}: {
  event: Event;
  isAuthed: boolean;
  reminderIsSet: boolean;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [isFinalizingLogin, startLoginRefresh] = useTransition();
  const pendingInternalPathRef = useRef<string | null>(null);
  const pendingUrlRef = useRef<string | null>(null);
  const postLoginRef = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    posthog.capture('experience_viewed', {
      event_id: event.id,
      event_slug: event.slug,
      event_title: event.title,
      has_coupon: event.hasCoupon,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  // Reveal-on-scroll: toggle `.in` on `.rv` elements as they enter view.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>('.rv'));
    if (typeof IntersectionObserver === 'undefined' ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
      { rootMargin: '-8% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const showCoupon = event.hasCoupon && event.couponDiscountPercent != null;
  const dateStr = fmtFullDate(event.startTime);
  const timeStr = fmtTime(event.startTime);
  const priceStr = fmtPrice(event.priceMin, event.currency) || 'Free';
  const cover = event.coverImageUrl || event.imageUrl || null;
  const gallery = (event.galleryImages ?? []).filter((u) => u && u !== cover);
  const mapUrl =
    event.latitude != null && event.longitude != null
      ? `https://maps.google.com/?q=${event.latitude},${event.longitude}`
      : null;

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

  const cta = couponCta(event);
  const heroCtaLabel = showCoupon && cta.intent === 'login'
    ? `Register at ${event.couponDiscountPercent}% off`
    : 'Register →';

  const handleRegisterClick = useCallback(
    (e: React.MouseEvent) => {
      posthog.capture('experience_register_clicked', {
        event_id: event.id, event_slug: event.slug, event_title: event.title, source: 'detail',
      });
      if (cta.intent === 'login') {
        e.preventDefault();
        pendingUrlRef.current = null;
        setLoginOpen(true);
      }
    },
    [cta.intent, event.id, event.slug, event.title],
  );

  const handleLoginSuccess = useCallback(() => {
    postLoginRef.current = true;
    startLoginRefresh(() => router.refresh());
  }, [router]);

  useEffect(() => {
    if (!isFinalizingLogin && postLoginRef.current) {
      postLoginRef.current = false;
      const internal = pendingInternalPathRef.current;
      const external = pendingUrlRef.current;
      pendingInternalPathRef.current = null;
      pendingUrlRef.current = null;
      setLoginOpen(false);
      if (internal) router.push(internal);
      else if (external) window.open(external, '_blank', 'noopener,noreferrer');
    }
  }, [isFinalizingLogin, router]);

  // Shared Register control (hero + end CTA + sticky use variants of this).
  const registerNode = (className: string) => {
    if (isAlreadyRegistered) {
      return (
        <Link href={`/me/registrations/${myActiveRegistration!.id}`} className="exd-btn exd-btn-booked">
          ✓ Show ticket
        </Link>
      );
    }
    if (event.eventSourceType === 'organizer') {
      return (
        <Link
          href={eventPath(event, '/register')}
          className={className}
          onClick={(e) => {
            posthog.capture('experience_register_clicked', { event_id: event.id, event_slug: event.slug, source: 'detail' });
            if (!isAuthed) {
              e.preventDefault();
              pendingInternalPathRef.current = eventPath(event, '/register');
              setLoginOpen(true);
            }
          }}
        >
          Register →
        </Link>
      );
    }
    if (event.registrationUrl) {
      return (
        <a className={className} href={event.registrationUrl} target="_blank" rel="noopener noreferrer" onClick={handleRegisterClick}>
          {heroCtaLabel}
        </a>
      );
    }
    return <span className={`${className} exd-btn-disabled`}>Registration TBD</span>;
  };

  return (
    <div className="exd" ref={rootRef}>
      {showCoupon && (
        <CouponTopStrip
          couponCode={event.couponCode ?? null}
          couponDiscountPercent={event.couponDiscountPercent ?? null}
          hasCoupon
          size="md"
        />
      )}

      {/* ═══ HERO ═══ */}
      <section className="exd-section exd-hero">
        <div className="exd-blob exd-blob-magenta exd-blob-1" aria-hidden />
        <div className="exd-blob exd-blob-purple exd-blob-2" aria-hidden />
        <div className="exd-wrap">
          <div className="rv">
            <span className="exd-eyebrow">{event.category === 'experience' ? 'Experience' : 'Run'}{event.eventType ? ` · ${titleCase(event.eventType)}` : ''}</span>
            <h1 className="exd-title"><span className="chroma-i">{event.title}</span></h1>
            {event.organizerName && (
              <p className="exd-byline">By <strong>{event.organizerName}</strong></p>
            )}

            <div className="exd-meta">
              <span className="exd-pill">{I.cal}<b>{dateStr}</b> · {timeStr}</span>
              {(event.venueName || event.locationName) && (
                <span className="exd-pill">{I.pin}<b>{event.venueName || event.locationName}</b></span>
              )}
              <span className="exd-pill">{I.tag}From <b>{priceStr}</b></span>
              {event.ngoName && (
                <span className="exd-pill">❤️&nbsp;Proceeds to <b>{event.ngoName}</b></span>
              )}
              {isAlreadyRegistered ? (
                <span className="exd-pill">{I.ppl}<b>You&rsquo;re in</b></span>
              ) : (event.totalTicketsSold ?? 0) > 0 ? (
                <span className="exd-pill">{I.ppl}<b>{event.totalTicketsSold!.toLocaleString('en-IN')}</b> booked</span>
              ) : null}
            </div>

            <div className="exd-cta-row">
              {registerNode('exd-btn exd-btn-red')}
              <ReminderButton
                eventType="race"
                eventId={event.id}
                eventStartTime={event.startTime}
                eventTitle={event.title}
                initialIsSet={reminderIsSet}
                isAuthed={isAuthed}
              />
              {event.registrationEndDate && (
                <span className="exd-cta-meta">Booking closes {fmtFullDate(event.registrationEndDate)}</span>
              )}
            </div>
          </div>

          {cover && (
            <div className="exd-cover rv">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt={event.title} />
            </div>
          )}
          {gallery.length > 0 && (
            <div className="exd-gallery rv">
              {gallery.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="" />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══ ABOUT ═══ */}
      <section className="exd-section">
        <div className="exd-wrap rv">
          <div className="exd-section-h"><h2 className="exd-h2">About this {event.category === 'experience' ? 'experience' : 'run'}</h2></div>
          <div className="exd-card">
            <div className="exd-prose"><ReactMarkdown>{buildEventNarrative(event)}</ReactMarkdown></div>
          </div>
        </div>
      </section>

      {/* ═══ TICKETS ═══ */}
      {event.distanceCategories.length > 0 && (
        <section className="exd-section">
          <div className="exd-wrap rv">
            <div className="exd-section-h">
              <h2 className="exd-h2">Tickets</h2>
              <span className="exd-section-meta">
                {event.distanceCategories.length} {event.distanceCategories.length === 1 ? 'type' : 'types'}
              </span>
            </div>
            <div className="exd-tickets">
              {event.distanceCategories.map((d) => {
                const price = hasAnyPrice(event.distanceCategories)
                  ? fmtPrice(d.discountedPrice ?? d.price, d.currency || event.currency)
                  : null;
                const was =
                  d.discountedPrice != null && d.price != null && d.price !== d.discountedPrice
                    ? fmtPrice(d.price, d.currency || event.currency)
                    : null;
                return (
                  <div key={d.id} className="exd-ticket">
                    <div className="exd-ticket-name">{d.categoryName}</div>
                    {price && (
                      <div className="exd-ticket-price">{price}{was && <span className="exd-ticket-was">{was}</span>}</div>
                    )}
                    {d.inclusions && d.inclusions.length > 0 && (
                      <div className="exd-ticket-incl">
                        {d.inclusions.map((inc, i) => <span key={i} className="exd-incl-pill">{inc}</span>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══ LOCATION ═══ */}
      {(event.venueName || event.locationName) && (
        <section className="exd-section">
          <div className="exd-wrap rv">
            <div className="exd-section-h"><h2 className="exd-h2">Where</h2></div>
            <div className="exd-card">
              <div className="exd-venue-name">{event.venueName || event.locationName}</div>
              {event.locationAddress && <div className="exd-venue-addr">{event.locationAddress}</div>}
              {mapUrl && (
                <div style={{ marginTop: 16 }}>
                  <a className="exd-btn exd-btn-ghost" href={mapUrl} target="_blank" rel="noopener noreferrer">Open in Google Maps ↗</a>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══ WHERE YOUR MONEY GOES (charity) ═══ */}
      {event.ngoName && (
        <section className="exd-section">
          <div className="exd-wrap rv">
            <div className="exd-section-h"><h2 className="exd-h2">Where your money goes</h2></div>
            <div className="exd-card exd-org">
              <div
                className="exd-org-av"
                style={event.ngoLogoUrl ? { overflow: 'hidden', background: '#fff', padding: 6 } : undefined}
              >
                {event.ngoLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.ngoLogoUrl}
                    alt={`${event.ngoName} logo`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  event.ngoName.charAt(0).toUpperCase()
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="exd-org-name">
                  {event.donationPercent != null
                    ? `${event.donationPercent}% of proceeds support ${event.ngoName}`
                    : `Proceeds support ${event.ngoName}`}
                </div>
                {event.donationNoteMd && (
                  <div className="exd-prose exd-org-meta"><ReactMarkdown>{event.donationNoteMd}</ReactMarkdown></div>
                )}
              </div>
              {event.ngoUrl && (
                <a className="exd-btn exd-btn-ghost" href={event.ngoUrl} target="_blank" rel="noopener noreferrer">Visit {event.ngoName} ↗</a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══ ORGANISER ═══ */}
      {event.organizerName && (
        <section className="exd-section">
          <div className="exd-wrap rv">
            <div className="exd-section-h"><h2 className="exd-h2">Organiser</h2></div>
            <div className="exd-card exd-org">
              <div
                className="exd-org-av"
                style={event.organizerLogoUrl ? { overflow: 'hidden', background: '#fff', padding: 6 } : undefined}
              >
                {event.organizerLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.organizerLogoUrl}
                    alt={`${event.organizerName} logo`}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  event.organizerName.charAt(0).toUpperCase()
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="exd-org-name">{event.organizerName}</div>
                <div className="exd-org-meta">
                  {event.organizerEmail && <a href={`mailto:${event.organizerEmail}`}>{event.organizerEmail}</a>}
                  {event.organizerPhone && (<>{event.organizerEmail ? ' · ' : ''}<a href={`tel:${event.organizerPhone}`}>{event.organizerPhone}</a></>)}
                </div>
              </div>
              {event.website && (
                <a className="exd-btn exd-btn-ghost" href={event.website} target="_blank" rel="noopener noreferrer">Website ↗</a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══ TERMS / REFUND ═══ */}
      {(event.refundPolicyMd || event.termsMd) && (
        <section className="exd-section">
          <div className="exd-wrap rv">
            <div className="exd-card" style={{ paddingTop: 4, paddingBottom: 4 }}>
              {event.refundPolicyMd && (
                <details className="exd-disclosure">
                  <summary><span>Refund policy</span><span className="exd-disclosure-icon" aria-hidden>+</span></summary>
                  <div className="exd-prose exd-disclosure-body"><ReactMarkdown>{event.refundPolicyMd}</ReactMarkdown></div>
                </details>
              )}
              {event.termsMd && (
                <details className="exd-disclosure">
                  <summary><span>Terms &amp; conditions</span><span className="exd-disclosure-icon" aria-hidden>+</span></summary>
                  <div className="exd-prose exd-disclosure-body"><ReactMarkdown>{event.termsMd}</ReactMarkdown></div>
                </details>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══ END CTA ═══ */}
      <section className="exd-end">
        <div className="exd-blob exd-blob-red exd-blob-3" aria-hidden />
        <div className="exd-wrap rv">
          <h2>Save your <span className="chroma-i">spot.</span></h2>
          <p>
            {event.registrationEndDate
              ? `Booking closes ${fmtFullDate(event.registrationEndDate)}.`
              : 'Limited tickets — grab yours now.'}
          </p>
          <div className="exd-cta-row">{registerNode('exd-btn exd-btn-red')}</div>
        </div>
      </section>

      {/* ═══ MOBILE STICKY BAR (portaled to body) ═══ */}
      {mounted &&
        createPortal(
          <div className="exd-sticky-bar">
            <div>
              <div className="exd-sticky-price">{priceStr}<small> onwards</small></div>
              {event.registrationEndDate ? (
                <div className="exd-sticky-deadline">
                  Closes {new Date(event.registrationEndDate).toLocaleString('en-GB', { day: 'numeric', month: 'short', timeZone: IST })}
                </div>
              ) : (event.venueName || event.locationName) ? (
                <div className="exd-sticky-deadline">{event.venueName || event.locationName}</div>
              ) : null}
            </div>
            {isAlreadyRegistered ? (
              <Link className="exd-sticky-cta" href={`/me/registrations/${myActiveRegistration!.id}`}>✓ Show ticket</Link>
            ) : event.eventSourceType === 'organizer' ? (
              <Link
                className="exd-sticky-cta"
                href={eventPath(event, '/register')}
                onClick={(e) => {
                  if (!isAuthed) {
                    e.preventDefault();
                    pendingInternalPathRef.current = eventPath(event, '/register');
                    setLoginOpen(true);
                  }
                }}
              >
                Register →
              </Link>
            ) : event.registrationUrl ? (
              <a className="exd-sticky-cta" href={event.registrationUrl} target="_blank" rel="noopener noreferrer" onClick={handleRegisterClick}>
                {heroCtaLabel}
              </a>
            ) : (
              <span className="exd-sticky-cta exd-sticky-cta-disabled">Registration TBD</span>
            )}
          </div>,
          document.body,
        )}

      <LoginModal
        open={loginOpen || isFinalizingLogin}
        onClose={() => setLoginOpen(false)}
        onSuccess={handleLoginSuccess}
        finalizing={isFinalizingLogin}
        context={<RaceCouponContext race={event} />}
        title={
          showCoupon ? (<>One tap to your <span className="v1lm-red">discount.</span></>)
                     : (<>Sign in to <span className="v1lm-red">book.</span></>)
        }
        subtitle={
          showCoupon
            ? 'Sign in to unlock your member discount.'
            : 'Sign in so we can save your booking and remind you on the day.'
        }
      />
    </div>
  );
}
