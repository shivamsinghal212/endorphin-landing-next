<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Endorfin Next.js App Router project. Here's a summary of all changes made:

**Infrastructure:**
- Installed `posthog-js` and `posthog-node` packages
- Created `instrumentation-client.ts` (root) — initializes PostHog client-side via Next.js 15.3+ instrumentation hook, with error tracking (`capture_exceptions: true`) and a reverse proxy via `/ingest`
- Created `src/lib/posthog-server.ts` — singleton `posthog-node` client for server-side event capture
- Updated `next.config.ts` — added `/ingest/*` reverse proxy rewrites so PostHog traffic routes through the app domain (better ad-blocker resilience), plus `skipTrailingSlashRedirect: true`
- Added `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` to `.env.local`

**User identification:** `posthog.identify()` is called on every successful sign-in (email, OTP, Google), using `user.id` as the distinct ID with `email`, `name`, and `auth_provider` as person properties. This ensures all subsequent events from that session are tied to the correct user.

**Events instrumented:**

| Event name | Description | File |
|---|---|---|
| `user_signed_in` | User signs in with email/password | `src/components/LoginModal.tsx` |
| `user_signed_up` | User verifies OTP and completes registration | `src/components/LoginModal.tsx` |
| `user_google_signed_in` | User signs in or registers via Google | `src/components/LoginModal.tsx` |
| `club_joined` | User submits join form (auto-join or request sent) | `src/app/clubs/[slug]/join-club-form-modal.tsx` |
| `club_left` | User leaves an active club membership | `src/app/clubs/[slug]/join-club-button.tsx` |
| `club_join_request_cancelled` | User withdraws a pending join request | `src/app/clubs/[slug]/join-club-button.tsx` |
| `event_rsvp` | User RSVPs to a club run event | `src/app/clubs/[slug]/rsvp-button.tsx` |
| `event_rsvp_cancelled` | User cancels their RSVP to a club run event | `src/app/clubs/[slug]/rsvp-button.tsx` |
| `race_register_clicked` | User clicks the Register CTA (listing or detail page) | `src/app/races/RacesView.tsx`, `src/app/races/[slug]/RaceDetailView.tsx` |
| `city_filter_selected` | User selects a city chip to filter races | `src/app/races/RacesView.tsx` |
| `race_viewed` | User views a race detail page (funnel top) | `src/app/races/[slug]/RaceDetailView.tsx` |
| `kip_waitlist_joined` | User successfully joins the Kip waitlist | `src/app/workout-plan/WorkoutPlanView.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/1585128)
- [New signups & sign-ins over time](/insights/3pH3k2y7)
- [Race registration conversion funnel](/insights/m1dvE4pl) — shows drop-off from race view to register click
- [Club engagement — joins & RSVPs](/insights/zqdDEx8G)
- [Kip waitlist growth](/insights/PlnCTuta)
- [Race register clicks by source](/insights/q0lXSyRs) — listing vs detail page

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
