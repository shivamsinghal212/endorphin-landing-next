'use client';

import Link from 'next/link';
import { useIsSuperAdmin } from '@/lib/use-admin-token';

/** Contextual sub-bar — sticks below the marketing v1-nav so back nav and
 *  per-page actions stay reachable while scrolling. Account/auth lives in
 *  the main header. */
export function StudioTopBar({
  title,
  back,
  right,
}: {
  title?: React.ReactNode;
  back?: { href: string; label?: string } | null;
  right?: React.ReactNode;
}) {
  const isSuper = useIsSuperAdmin();

  // Only render the bar when there's something visible. The "Super admin"
  // link alone isn't enough — it's hidden on mobile, which would leave an
  // empty strip below the v1-nav.
  if (!back && !title && !right) return null;

  return (
    <div
      className="sticky z-20 bg-[#F8F6F3]/95 backdrop-blur border-b border-jet/10"
      style={{ top: 'var(--nav-h, 68px)' }}
    >
      <div className="max-w-6xl mx-auto px-3 md:px-6 py-2 flex items-center gap-2 md:gap-3 min-w-0">
        {back && (
          <Link
            href={back.href}
            className="flex-shrink-0 flex items-center gap-1.5 text-sm text-jet/60 hover:text-jet rounded-md px-2 py-1 -ml-2 hover:bg-jet/5 transition-colors"
            aria-label={back.label || 'Back'}
          >
            <span aria-hidden>←</span>
            <span className="hidden md:inline">{back.label || 'Back'}</span>
          </Link>
        )}

        {title ? <div className="flex-1 min-w-0 truncate">{title}</div> : <div className="flex-1" />}

        {right && <div className="flex-shrink-0">{right}</div>}

        {isSuper && (
          <Link
            href="/admin"
            className="hidden md:inline flex-shrink-0 text-xs px-2.5 py-1.5 rounded-md text-jet/60 hover:bg-jet/5 hover:text-jet"
            title="Switch to super-admin"
          >
            Super admin →
          </Link>
        )}
      </div>
    </div>
  );
}

export function StudioCard({
  children,
  className = '',
  as: As = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section';
}) {
  return (
    <As className={`bg-white border border-jet/10 rounded-2xl ${className}`}>
      {children}
    </As>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'default' | 'attention';
}) {
  return (
    <div className="bg-white border border-jet/10 rounded-2xl p-4 flex flex-col justify-between min-h-[120px]">
      <p className="text-[10px] uppercase tracking-wider text-jet/40">{label}</p>
      <div>
        <p
          className={`font-display text-3xl font-bold tabular-nums ${
            tone === 'attention' ? 'text-signal' : ''
          }`}
        >
          {value}
        </p>
        {hint ? <p className="text-[11px] text-jet/50 mt-0.5">{hint}</p> : null}
      </div>
    </div>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
      <span className="w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-sm font-bold">
        !
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-900">
          {title || 'Something went wrong'}
        </p>
        {message ? (
          <p className="text-xs text-red-800/80 mt-0.5 break-words">{message}</p>
        ) : null}
      </div>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="text-xs px-3 py-1.5 rounded-md bg-red-600 text-white font-medium hover:bg-red-700"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  cta,
}: {
  title: string;
  message?: string;
  cta?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <div className="text-center py-12 px-4">
      <p className="font-display uppercase text-sm font-bold text-jet/50 mb-1">
        {title}
      </p>
      {message ? <p className="text-xs text-jet/40 max-w-sm mx-auto">{message}</p> : null}
      {cta ? (
        cta.href ? (
          <Link
            href={cta.href}
            className="inline-block mt-4 px-4 py-2 rounded-lg bg-jet text-bone text-sm font-medium hover:bg-jet/90"
          >
            {cta.label}
          </Link>
        ) : (
          <button
            onClick={cta.onClick}
            className="mt-4 px-4 py-2 rounded-lg bg-jet text-bone text-sm font-medium hover:bg-jet/90"
          >
            {cta.label}
          </button>
        )
      ) : null}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-md bg-jet/5 animate-pulse ${className}`}
      aria-hidden
    />
  );
}

export function ClubAvatar({
  src,
  name,
  size = 48,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="rounded-xl object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-xl bg-gradient-to-br from-jet to-signal flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, fontSize: size / 3 }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}
