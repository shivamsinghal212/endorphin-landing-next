import KipOnboardForm from './KipOnboardForm';

const CHIPS = [
  'Approve members',
  'Schedule runs',
  'Live RSVPs',
  'Custom join forms',
  'Co-admins',
  'Free',
];

interface PendingRow {
  initials: string;
  name: string;
  meta: string;
  accent?: boolean;
}

// Same mock data as the Studio "Members" tab on /clubs — keeps the homepage
// pitch and the deep-dive page consistent in tone.
const PENDING: PendingRow[] = [
  { initials: 'AK', name: 'Aarav Kapoor', meta: '5:30/km · training for ADHM' },
  { initials: 'SM', name: 'Simran Mehta', meta: '6:10/km · returning runner' },
  { initials: 'VI', name: 'Vikram Iyer', meta: '4:50/km · sub-90 half goal' },
  { initials: 'NP', name: 'Neel Patil', meta: 'New to running · friend of Aarav', accent: true },
];

const ChevronLeft = () => (
  <svg className="v1-kip-phone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

const Kebab = () => (
  <svg className="v1-kip-phone-icon" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="19" cy="12" r="1.5" />
  </svg>
);

const ManageClubSection = () => (
  <section className="v1-kip">
    <div className="v1-kip-grid">
      <div>
        <div className="v1-kip-kicker">Run a club? · Endorfin Studio</div>
        <h2 className="v1-kip-title">
          Manage your<br />run club like a<br />
          <span className="accent">pro.</span>
        </h2>
        <p className="v1-kip-body">
          Approve runners, plan your next session, see who&apos;s actually showing up
          — all in one place. Studio gives organisers the tools to grow without
          spreadsheets, a 400-person WhatsApp group, or 5am &ldquo;where do we
          meet?&rdquo; messages.
        </p>
        <div className="v1-kip-features">
          {CHIPS.map((c) => (
            <span key={c} className="v1-kip-chip">{c}</span>
          ))}
        </div>
        <KipOnboardForm />
      </div>

      <div className="v1-kip-phone-stage">
        <div className="v1-kip-phone">
          <div className="v1-kip-phone-screen">
            <div className="v1-kip-phone-notch" />
            <div className="v1-kip-phone-status">
              <span>9:41</span>
              <span className="v1-kip-phone-status-right">5G · 100%</span>
            </div>
            <div className="v1-kip-phone-appbar">
              <ChevronLeft />
              <div className="v1-kip-avatar" style={{ width: 32, height: 32, fontSize: 14 }}>BR</div>
              <div className="v1-kip-phone-appbar-info">
                <div className="v1-kip-chat-name">Bandra Run Squad</div>
                <div className="v1-kip-chat-sub">Members · 1,240 active</div>
              </div>
              <Kebab />
            </div>

            <div className="v1-club-mock-tabs">
              <span className="v1-club-mock-tab is-active">Members</span>
              <span className="v1-club-mock-tab">Events</span>
              <span className="v1-club-mock-tab">RSVPs</span>
            </div>

            <div className="v1-club-mock-list">
              <div className="v1-club-mock-list-head">
                <span><strong>Pending</strong> · 4 requests</span>
                <span>Today</span>
              </div>
              {PENDING.map((row) => (
                <div key={row.name} className="v1-club-mock-row">
                  <div className={`v1-club-mock-av ${row.accent ? 'is-accent' : ''}`}>
                    {row.initials}
                  </div>
                  <div className="v1-club-mock-row-main">
                    <div className="v1-club-mock-row-name">{row.name}</div>
                    <div className="v1-club-mock-row-meta">{row.meta}</div>
                  </div>
                  <span className={`v1-club-mock-action ${row.accent ? 'is-muted' : ''}`}>
                    {row.accent ? 'Review' : 'Approve'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default ManageClubSection;
