'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import CouponTopStrip from '@/components/CouponTopStrip';
import LoginModal from '@/components/LoginModal';
import RaceCouponContext from '@/components/RaceCouponContext';
import { couponCta } from '@/lib/coupon-cta';
import type { Event, DistanceCategory } from '@/lib/api';

function fmtFullDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
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

export default function RaceDetailView({ event }: { event: Event }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  useEffect(() => setMounted(true), []);
  const showCoupon = event.hasCoupon && event.couponDiscountPercent != null;
  const dateStr = fmtFullDate(event.startTime);
  const timeStr = fmtTime(event.startTime);
  const priceStr = fmtPrice(event.priceMin, event.currency) || 'Free';
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

  const handleHeroCta = useCallback(
    (e: React.MouseEvent) => {
      // Anon + coupon → open login. Otherwise let the underlying anchor handle it.
      if (cta.intent === 'login') {
        e.preventDefault();
        setLoginOpen(true);
      }
    },
    [cta.intent],
  );

  const handleLoginSuccess = useCallback(() => {
    setLoginOpen(false);
    router.refresh();
  }, [router]);

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
              <div className="v1rd-l">{event.goingCount > 0 ? 'Going' : 'Registered'}</div>
              <div className="v1rd-v">
                {event.goingCount > 0 ? (
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
            {event.registrationUrl ? (
              <a
                className="v1rd-btn v1rd-btn-primary"
                href={event.registrationUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleHeroCta}
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
              <h2>Where it starts</h2>
              <span className="v1rd-block-meta">
                {event.locationName}
                {event.latitude != null && event.longitude != null
                  ? ` · ${event.latitude.toFixed(4)}, ${event.longitude.toFixed(4)}`
                  : ''}
              </span>
            </div>
            <div className="v1rd-venue">
              <h3>{event.venueName || event.locationName}</h3>
              {event.locationAddress && <div className="v1rd-venue-addr">{event.locationAddress}</div>}
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
                onClick={handleHeroCta}
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
                    })}
                  </div>
                ) : event.locationName ? (
                  <div className="v1rd-sticky-deadline">{event.locationName}</div>
                ) : null}
              </div>
              {event.registrationUrl ? (
                <a
                  className="v1rd-sticky-cta"
                  href={event.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleHeroCta}
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
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={handleLoginSuccess}
        context={<RaceCouponContext race={event} />}
        title={
          <>
            One tap to your <span className="v1lm-red">discount.</span>
          </>
        }
        subtitle="Sign in to unlock your member discount."
      />
    </div>
  );
}
