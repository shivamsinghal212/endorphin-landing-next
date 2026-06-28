'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ErrorState, Skeleton } from '@/app/admin/studio/_components/ui';
import {
  PrimaryButton,
  SecondaryButton,
  TextInput,
} from '@/app/admin/studio/_components/form';
import {
  describeOrganiserError,
  useCancelRegistration,
  useCoupons,
  useEventRegistrations,
} from '@/lib/studio/organiser-hooks';
import { listEventRegistrations } from '@/lib/organiser-api';
import type { Coupon, OrganiserEvent, RegistrationRow } from '@/lib/organiser-api';
import { useAdminToken } from '@/lib/use-admin-token';
import {
  describeRunner,
  formatINR,
  relativeTime,
  runnerInitials,
  statusChip,
} from './_utils';
import { RefundDialog } from './refund-dialog';

const PAGE_LIMIT = 50;

const PAYMENT_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All payments' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'free', label: 'Free' },
];

export function Registrations({
  eventId,
  event,
}: {
  eventId: string;
  event: OrganiserEvent | null;
}) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [distanceId, setDistanceId] = useState('');
  const [offset, setOffset] = useState(0);

  // Debounce search → committed query.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setOffset(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset paging when filters change.
  useEffect(() => {
    setOffset(0);
  }, [paymentStatus, distanceId]);

  const filters = useMemo(
    () => ({
      limit: PAGE_LIMIT,
      offset,
      ...(search ? { search } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(distanceId ? { distanceId } : {}),
    }),
    [search, paymentStatus, distanceId, offset],
  );

  const listQ = useEventRegistrations(eventId, filters);
  const couponsQ = useCoupons(eventId);
  const couponsById = new Map<string, Coupon>(
    (couponsQ.data ?? []).map((c) => [c.id, c]),
  );

  const token = useAdminToken();
  // Custom-question fields (id → label) drive the expandable responses view
  // and the per-question CSV columns.
  const formFields = useMemo(
    () => (event?.registrationForm ?? []).map((f) => ({ id: f.id, label: f.label })),
    [event?.registrationForm],
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportCsv = async () => {
    if (!token || exporting) return;
    setExporting(true);
    try {
      // The table is paginated; the export is not — pull every matching row.
      const all: RegistrationRow[] = [];
      let off = 0;
      for (;;) {
        const res = await listEventRegistrations(token, eventId, {
          limit: 200,
          offset: off,
          ...(search ? { search } : {}),
          ...(paymentStatus ? { paymentStatus } : {}),
          ...(distanceId ? { distanceId } : {}),
        });
        all.push(...res.items);
        off += res.items.length;
        if (res.items.length === 0 || off >= res.total) break;
      }
      const distanceName = (id: string | null) =>
        event?.distanceCategories?.find((d) => d.id === id)?.categoryName ?? '';
      const csv = buildRegistrationsCsv(all, { distanceName, couponsById, formFields });
      downloadCsv(csv, `${event?.slug || 'registrations'}.csv`);
    } catch (e) {
      toast.error(describeOrganiserError(e));
    } finally {
      setExporting(false);
    }
  };

  const total = listQ.data?.total ?? 0;
  const rows = listQ.data?.items ?? [];
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(total, offset + rows.length);

  // Refund dialog + optimistic "queued" indicator until the row refetches
  // with paymentStatus === 'refunded'. The Set is keyed by registrationId.
  const [refundTarget, setRefundTarget] = useState<RegistrationRow | null>(null);
  const [pendingRefundIds, setPendingRefundIds] = useState<Set<string>>(
    () => new Set(),
  );

  // Drop pending markers once the row reflects the refund server-side.
  useEffect(() => {
    if (pendingRefundIds.size === 0) return;
    const settled = new Set<string>();
    for (const row of rows) {
      if (pendingRefundIds.has(row.id) && row.paymentStatus === 'refunded') {
        settled.add(row.id);
      }
    }
    if (settled.size > 0) {
      setPendingRefundIds((prev) => {
        const next = new Set(prev);
        for (const id of settled) next.delete(id);
        return next;
      });
    }
  }, [rows, pendingRefundIds]);

  const distanceLabelFor = (row: RegistrationRow) =>
    event?.distanceCategories?.find((d) => d.id === row.distanceCategoryId)
      ?.categoryName ?? '—';

  // Mark-as-failed action. Available on non-paid rows (paid rows must use
  // the Refund action so we don't silently lose captured money).
  const cancelMut = useCancelRegistration(eventId);
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(() => new Set());
  const handleCancel = async (row: RegistrationRow) => {
    const ok = window.confirm(
      `Mark ${row.attendeeName || row.user?.name || 'this registration'} as failed? They'll be removed from the event roster. This can't be undone here.`,
    );
    if (!ok) return;
    setCancellingIds((prev) => new Set(prev).add(row.id));
    try {
      await cancelMut.mutateAsync({ registrationId: row.id });
      toast.success('Registration marked as failed');
    } catch (e) {
      toast.error(describeOrganiserError(e));
    } finally {
      setCancellingIds((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
    }
  };

  return (
    <>
      <div className="bg-white border border-jet/10 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[180px]">
            <TextInput
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Search name, email, attendee…"
            />
          </div>
          <Select
            value={paymentStatus}
            onChange={setPaymentStatus}
            options={PAYMENT_OPTIONS}
          />
          <Select
            value={distanceId}
            onChange={setDistanceId}
            options={[
              { value: '', label: 'All distances' },
              ...(event?.distanceCategories ?? [])
                .filter((d) => d.id)
                .map((d) => ({ value: d.id as string, label: d.categoryName })),
            ]}
          />
          <SecondaryButton onClick={handleExportCsv} disabled={exporting || total === 0}>
            {exporting ? 'Exporting…' : 'Export CSV ↓'}
          </SecondaryButton>
        </div>
      </div>

      <div className="bg-white border border-jet/10 rounded-2xl">
        <div className="px-5 py-3 flex items-baseline justify-between border-b border-jet/5">
          <p className="font-display uppercase text-sm font-bold">All registrations</p>
          <p className="text-[11px] text-jet/50">
            {total > 0
              ? `Showing ${pageStart}–${pageEnd} of ${total.toLocaleString('en-IN')}`
              : null}
          </p>
        </div>

        {listQ.isError ? (
          <div className="p-5">
            <ErrorState
              title="Couldn't load registrations"
              message={String(listQ.error)}
              onRetry={() => listQ.refetch()}
            />
          </div>
        ) : listQ.isLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="p-5 text-sm text-jet/50">No registrations match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="text-[10px] uppercase tracking-wider text-jet/50 bg-jet/[0.02]">
                <tr>
                  <th className="text-left px-5 py-2.5 font-medium">Runner</th>
                  <th className="text-left px-3 py-2.5 font-medium">Distance</th>
                  <th className="text-left px-3 py-2.5 font-medium">Paid</th>
                  <th className="text-left px-3 py-2.5 font-medium">Coupon</th>
                  <th className="text-left px-3 py-2.5 font-medium">Status</th>
                  <th className="text-left px-3 py-2.5 font-medium">When</th>
                  <th className="text-right px-3 py-2.5 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-jet/5">
                {rows.map((row) => (
                  <Row
                    key={row.id}
                    row={row}
                    distances={event?.distanceCategories ?? null}
                    couponsById={couponsById}
                    formFields={formFields}
                    expanded={expandedId === row.id}
                    onToggle={() =>
                      setExpandedId((id) => (id === row.id ? null : row.id))
                    }
                    refundPending={pendingRefundIds.has(row.id)}
                    onRefund={() => setRefundTarget(row)}
                    onCancel={() => handleCancel(row)}
                    cancelPending={cancellingIds.has(row.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > PAGE_LIMIT && (
          <div className="px-5 py-3 flex items-center justify-end gap-2 border-t border-jet/5">
            <SecondaryButton
              disabled={offset === 0 || listQ.isFetching}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_LIMIT))}
            >
              ← Previous
            </SecondaryButton>
            <PrimaryButton
              disabled={offset + rows.length >= total || listQ.isFetching}
              onClick={() => setOffset((o) => o + PAGE_LIMIT)}
            >
              Next →
            </PrimaryButton>
          </div>
        )}
      </div>

      <RefundDialog
        eventId={eventId}
        registration={refundTarget}
        distanceLabel={refundTarget ? distanceLabelFor(refundTarget) : '—'}
        open={refundTarget !== null}
        onClose={() => setRefundTarget(null)}
        onRefundQueued={(id) =>
          setPendingRefundIds((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
          })
        }
      />
    </>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2.5 rounded-xl border border-jet/10 text-sm bg-white focus:border-jet outline-none"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function Row({
  row,
  distances,
  couponsById,
  formFields,
  expanded,
  onToggle,
  refundPending,
  onRefund,
  onCancel,
  cancelPending,
}: {
  row: RegistrationRow;
  distances: OrganiserEvent['distanceCategories'] | null;
  couponsById: Map<string, Coupon>;
  formFields: { id: string; label: string }[];
  expanded: boolean;
  onToggle: () => void;
  refundPending: boolean;
  onRefund: () => void;
  onCancel: () => void;
  cancelPending: boolean;
}) {
  const distance =
    distances?.find((d) => d.id === row.distanceCategoryId)?.categoryName ?? '—';
  const chip = statusChip(row);
  const paidPaise = row.amountPaid ?? 0;
  const showVerifyAction = row.resultStatus === 'submitted';
  const couponCode = row.couponId ? couponsById.get(row.couponId)?.code : null;
  const refundEligible =
    row.paymentStatus === 'paid' && row.registrationStatus !== 'cancelled';
  // Cancel-eligible = not paid (paid must go through refund) and not already cancelled.
  const cancelEligible =
    row.paymentStatus !== 'paid' && row.registrationStatus !== 'cancelled';

  const hasResponses = formFields.length > 0;

  return (
    <>
    <tr>
      <td className="px-5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-jet text-bone grid place-items-center text-[10px] font-semibold flex-shrink-0">
            {runnerInitials(row.attendeeName || row.user?.name)}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-medium leading-tight truncate">
              {row.attendeeName || row.user?.name || 'Anonymous'}
            </p>
            <p className="text-[10px] text-jet/50 truncate">
              {/* For a group-booking line item show the attendee's own email
                  plus who paid; otherwise the usual runner descriptor. */}
              {row.attendeeName
                ? row.attendeeEmail || row.user?.email || '—'
                : describeRunner(row.user) || row.user?.email || '—'}
            </p>
            {row.bookingCode && (
              <p className="text-[10px] text-jet/45 truncate">
                <span className="inline-block px-1 py-0.5 rounded bg-jet/[0.06] font-mono tracking-tight mr-1">
                  {row.bookingCode}
                </span>
                {row.attendeeName && row.user?.name
                  ? `booked by ${row.user.name}`
                  : 'group booking'}
              </p>
            )}
            {hasResponses && (
              <button
                type="button"
                onClick={onToggle}
                className="text-[10px] text-signal hover:underline mt-0.5"
                aria-expanded={expanded}
              >
                {expanded ? 'Hide responses' : 'View responses'}
              </button>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-[12px]">{distance}</td>
      <td className="px-3 py-2.5 text-[12px]">
        {row.amountPaid != null ? formatINR(paidPaise) : '—'}
      </td>
      <td className="px-3 py-2.5 text-[12px]">
        {couponCode ? (
          <code className="text-[11px]">{couponCode}</code>
        ) : (
          <span className="text-jet/40">—</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={chip.className}>{chip.label}</span>
          {refundPending && row.paymentStatus !== 'refunded' && (
            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-medium bg-gold/20 text-gold">
              Refund queued
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-[11px] text-jet/55 whitespace-nowrap">
        {relativeTime(row.createdAt)}
      </td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {showVerifyAction && (
            <button
              type="button"
              onClick={() =>
                toast.info('Verification queue is a later stream', {
                  description:
                    'The verify/reject flow lands in an upcoming release.',
                })
              }
              className="text-[11px] px-2.5 py-1 rounded-md border border-jet/15 hover:bg-jet/5 whitespace-nowrap"
            >
              Verify
            </button>
          )}
          {refundEligible && (
            <button
              type="button"
              onClick={onRefund}
              disabled={refundPending}
              className="text-[11px] px-2.5 py-1 rounded-md border border-jet/15 hover:bg-jet/5 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refundPending ? 'Refund queued' : 'Cancel & refund'}
            </button>
          )}
          {cancelEligible && (
            <button
              type="button"
              onClick={onCancel}
              disabled={cancelPending}
              title="Cancel this registration (use Refund for paid rows)"
              className="text-[11px] px-2.5 py-1 rounded-md border border-jet/15 text-jet/70 hover:bg-signal hover:text-bone hover:border-signal whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cancelPending ? 'Cancelling…' : 'Mark failed'}
            </button>
          )}
          {!showVerifyAction && !refundEligible && !cancelEligible && (
            <span className="sr-only">No actions available</span>
          )}
        </div>
      </td>
    </tr>
    {expanded && hasResponses && (
      <tr className="bg-jet/[0.015]">
        <td colSpan={7} className="px-5 pb-4 pt-1">
          <p className="text-[10px] uppercase tracking-wider text-jet/45 mb-2">
            Form responses
          </p>
          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5">
            {formFields.map((f) => {
              const raw = (row.formData ?? {})[f.id];
              const val = Array.isArray(raw)
                ? raw.join(', ')
                : raw == null || raw === ''
                  ? '—'
                  : String(raw);
              return (
                <div key={f.id} className="flex gap-2 text-[12px]">
                  <dt className="text-jet/50 flex-shrink-0">{f.label}:</dt>
                  <dd className="text-jet font-medium break-words">{val}</dd>
                </div>
              );
            })}
          </dl>
        </td>
      </tr>
    )}
    </>
  );
}

// ── CSV export ──────────────────────────────────────────────────────────────

function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildRegistrationsCsv(
  rows: RegistrationRow[],
  opts: {
    distanceName: (id: string | null) => string;
    couponsById: Map<string, Coupon>;
    formFields: { id: string; label: string }[];
  },
): string {
  const { distanceName, couponsById, formFields } = opts;
  const headers = [
    'Name',
    'Email',
    'Distance',
    'Paid (INR)',
    'Coupon',
    'Payment',
    'Status',
    'Booking code',
    'Registered at',
    ...formFields.map((f) => f.label),
  ];
  const lines = [headers.map(csvEscape).join(',')];
  for (const r of rows) {
    const fd = (r.formData ?? {}) as Record<string, unknown>;
    const cells = [
      r.attendeeName || r.user?.name || '',
      r.attendeeEmail || r.user?.email || '',
      distanceName(r.distanceCategoryId),
      r.amountPaid != null ? (r.amountPaid / 100).toString() : '',
      r.couponId ? couponsById.get(r.couponId)?.code ?? '' : '',
      r.paymentStatus,
      r.registrationStatus,
      r.bookingCode || '',
      r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : '',
      ...formFields.map((f) => {
        const v = fd[f.id];
        return Array.isArray(v) ? v.join('; ') : v ?? '';
      }),
    ];
    lines.push(cells.map(csvEscape).join(','));
  }
  return lines.join('\n');
}

function downloadCsv(csv: string, filename: string): void {
  // Prepend a BOM so Excel reads UTF-8 (₹, names) correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
