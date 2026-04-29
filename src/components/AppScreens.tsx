'use client';

/** Inline app screen mockups — matches V2 design system */

const bone = "#F5F0EB";
const cream = "#EDE7E0";
const jet = "#0A0A0A";
const signal = "#E6232A";
const dim = "#8A8278";
const card = "#FFFFFF";
const divider = "#E0DAD3";
const tagBg = "#F0EBE5";

const PhoneFrame = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <div className="flex flex-col items-center gap-3 shrink-0">
    <span className="font-display text-[10px] uppercase tracking-[0.2em] text-signal">{label}</span>
    <div
      className="w-[260px] md:w-[280px] h-[560px] md:h-[600px] overflow-hidden overflow-y-auto rounded-[32px] shadow-2xl shadow-black/30"
      style={{
        background: bone,
        scrollbarWidth: "none",
        border: `1px solid ${divider}`,
      }}
    >
      <style>{`.ph::-webkit-scrollbar{display:none}`}</style>
      <div className="ph h-full overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        {children}
      </div>
    </div>
  </div>
);

const LogoSvg = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <g fill={signal} fillRule="evenodd" clipRule="evenodd">
      <path d="M8 1.5a6.48 6.48 0 00-4.707 2.017.75.75 0 11-1.086-1.034A7.98 7.98 0 018 0a7.98 7.98 0 015.793 2.483.75.75 0 11-1.086 1.034A6.48 6.48 0 008 1.5zM1.236 5.279a.75.75 0 01.514.927 6.503 6.503 0 004.727 8.115.75.75 0 11-.349 1.459 8.003 8.003 0 01-5.82-9.986.75.75 0 01.928-.515zm13.528 0a.75.75 0 01.928.515 8.003 8.003 0 01-5.82 9.986.75.75 0 01-.35-1.459 6.503 6.503 0 004.728-8.115.75.75 0 01.514-.927z"/>
      <path d="M8 4.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM3 8a5 5 0 1110 0A5 5 0 013 8z" opacity=".25"/>
    </g>
  </svg>
);

/* ====== HOME SCREEN ====== */
export const HomeScreen = () => (
  <PhoneFrame label="Home">
    {/* Topbar */}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "48px 18px 8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <LogoSvg />
        <span style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 14, color: jet }}>endorfin</span>
      </div>
      <div style={{ width: 18, height: 18, position: "relative" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={jet} strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
        <div style={{ position: "absolute", top: -1, right: -1, width: 6, height: 6, background: signal, borderRadius: "50%", border: `2px solid ${bone}` }} />
      </div>
    </div>

    {/* Greeting */}
    <div style={{ padding: "12px 18px 2px", fontSize: 11, color: dim }}>Good morning, <strong style={{ color: jet }}>Shivam</strong></div>
    <div style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 700, fontSize: 28, color: jet, padding: "2px 18px 16px", lineHeight: 1 }}>
      Find your next <span style={{ color: signal }}>race</span>
    </div>

    {/* Featured */}
    <div style={{
      margin: "0 18px 14px", borderRadius: 12, height: 180, position: "relative", overflow: "hidden",
      background: `url('https://images.unsplash.com/photo-1513593771513-7b58b6c4af38?w=400&q=80&auto=format&fit=crop') center/cover`,
    }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: "linear-gradient(to top, rgba(10,10,10,0.9) 0%, rgba(10,10,10,0.15) 55%, transparent)" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 2, padding: 14 }}>
        <div style={{ display: "inline-block", fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", padding: "3px 8px", background: signal, color: "white", borderRadius: 3, marginBottom: 6 }}>Featured</div>
        <div style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 16, color: "white", lineHeight: 1.1 }}>Mumbai Marathon 2026</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>Jan 19 · HM · 10K · 5K</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 600, padding: "6px 14px", background: "white", color: jet, borderRadius: 100 }}>I'm Going</div>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>127 going</span>
        </div>
      </div>
    </div>

    {/* Ribbon */}
    <div style={{ overflow: "hidden", background: jet, padding: "7px 0", marginBottom: 0 }}>
      <div style={{ display: "flex", whiteSpace: "nowrap", fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.25em", color: "rgba(245,240,235,0.25)" }}>
        <span style={{ padding: "0 16px" }}>5K · 10K · Half Marathon · Marathon · Ultra · Trail ·</span>
        <span style={{ padding: "0 16px" }}>5K · 10K · Half Marathon · Marathon · Ultra · Trail ·</span>
      </div>
    </div>

    {/* This Weekend */}
    <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 18px 8px" }}>
      <span style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: jet }}>This Weekend</span>
      <span style={{ fontSize: 10, color: signal, fontWeight: 500 }}>See all</span>
    </div>
    <div style={{ display: "flex", gap: 10, padding: "0 18px 16px", overflowX: "auto" }}>
      {[
        { t: "Bangalore 10K", m: "Feb 8", img: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=200&q=80&auto=format&fit=crop", tag: "10K" },
        { t: "Delhi Half", m: "Feb 9", img: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=200&q=80&auto=format&fit=crop", tag: "HM" },
      ].map(c => (
        <div key={c.t} style={{ flexShrink: 0, width: 120, borderRadius: 10, overflow: "hidden", background: card }}>
          <div style={{ width: "100%", height: 72, background: `url('${c.img}') center/cover` }} />
          <div style={{ padding: 8 }}>
            <div style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 500, fontSize: 11, color: jet, textTransform: "uppercase" }}>{c.t}</div>
            <div style={{ fontSize: 9, color: dim, marginTop: 2 }}>{c.m}</div>
            <div style={{ display: "inline-block", fontSize: 8, fontWeight: 600, padding: "2px 6px", background: tagBg, color: dim, borderRadius: 3, marginTop: 5, textTransform: "uppercase" }}>{c.tag}</div>
          </div>
        </div>
      ))}
    </div>

    {/* Upcoming */}
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 18px 8px" }}>
      <span style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: jet }}>Upcoming</span>
      <span style={{ fontSize: 10, color: signal, fontWeight: 500 }}>See all</span>
    </div>
    {[
      { t: "Goa River Marathon", m: "Mar 2 · Panaji", tag: "M" },
      { t: "Chennai Trail Ultra", m: "Mar 15 · ECR", tag: "Ultra" },
    ].map(e => (
      <div key={e.t} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderBottom: `1px solid ${divider}` }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: cream, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 500, fontSize: 12, color: jet, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.t}</div>
          <div style={{ fontSize: 9, color: dim, marginTop: 1 }}>{e.m}</div>
        </div>
        <div style={{ fontSize: 8, fontWeight: 600, padding: "3px 8px", background: signal, color: "white", borderRadius: 3, textTransform: "uppercase" }}>{e.tag}</div>
      </div>
    ))}
  </PhoneFrame>
);

/* ====== EVENT DETAIL SCREEN ====== */
export const EventScreen = () => (
  <PhoneFrame label="Event">
    <div style={{
      height: 220, position: "relative", overflow: "hidden",
      background: `url('/images/mumbai-marathon.png') center/cover`,
    }}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${bone} 0%, transparent 50%)` }} />
      <div style={{ position: "absolute", top: 44, left: 14, right: 14, display: "flex", justifyContent: "space-between", zIndex: 3 }}>
        <div style={{ width: 30, height: 30, background: "rgba(255,255,255,0.85)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: jet }}>&#8249;&#xFE0E;</div>
        <div style={{ width: 30, height: 30, background: "rgba(255,255,255,0.85)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: jet }}>&#9829;&#xFE0E;</div>
      </div>
    </div>
    <div style={{ padding: "0 18px 60px" }}>
      <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
        <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", padding: "4px 10px", borderRadius: 100, background: signal, color: "white" }}>HM</span>
        <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", padding: "4px 10px", borderRadius: 100, border: `1px solid ${jet}`, color: jet }}>10K</span>
        <span style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", padding: "4px 10px", borderRadius: 100, border: `1px solid ${jet}`, color: jet }}>5K</span>
      </div>
      <div style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 700, fontSize: 24, color: jet, lineHeight: 1.05, marginBottom: 4 }}>Mumbai Marathon 2026</div>
      <div style={{ fontSize: 10, color: dim, marginBottom: 14 }}>by <strong style={{ color: jet }}>Procam International</strong></div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <div style={{ flex: 1, fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 12, textTransform: "uppercase", padding: 10, background: jet, color: "white", borderRadius: 10, textAlign: "center" }}>&#10003; I'm Going</div>
        <div style={{ width: 40, height: 40, border: `1px solid ${divider}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>&#8599;&#xFE0E;</div>
      </div>
      {/* Info rows */}
      <div style={{ background: card, borderRadius: 10, marginBottom: 14 }}>
        {[
          { icon: "&#9716;&#xFE0E;", label: "Date & Time", value: "Sun, Jan 19 · 5:30 AM" },
          { icon: "&#9906;&#xFE0E;", label: "Location", value: "CST, Mumbai" },
          { icon: "&#8987;&#xFE0E;", label: "Reg. Ends", value: "Jan 10, 2026" },
        ].map((r, i) => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderTop: i > 0 ? `1px solid ${divider}` : "none" }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: tagBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: signal }} dangerouslySetInnerHTML={{ __html: r.icon }} />
            <div>
              <div style={{ fontSize: 9, color: dim, textTransform: "uppercase", letterSpacing: "0.06em" }}>{r.label}</div>
              <div style={{ fontSize: 12, color: jet, fontWeight: 500, marginTop: 1 }}>{r.value}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: dim, lineHeight: 1.6 }}>
        The Mumbai Marathon is one of India's most prestigious running events. Join thousands as they race through the heart of Mumbai.
      </div>
    </div>
    {/* Sticky price bar */}
    <div style={{ position: "sticky", bottom: 0, background: bone, borderTop: `1px solid ${divider}`, padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 10 }}>
      <div style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 700, fontSize: 18, color: jet }}>&#8377;1,500</div>
      <div style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 11, textTransform: "uppercase", padding: "10px 22px", background: signal, color: "white", borderRadius: 10 }}>Register</div>
    </div>
  </PhoneFrame>
);

/* ====== PROFILE SCREEN ====== */
export const ProfileScreen = () => (
  <PhoneFrame label="Profile">
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "48px 18px 0" }}>
      <span style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 700, fontSize: 16, color: jet, textTransform: "uppercase" }}>Profile</span>
      <span style={{ fontSize: 11, fontWeight: 600, color: signal }}>Edit</span>
    </div>
    <div style={{ textAlign: "center", padding: "22px 18px 18px" }}>
      <div style={{
        width: 72, height: 72, borderRadius: "50%", margin: "0 auto 12px",
        background: `linear-gradient(135deg, ${signal}, #FF6B4A)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Clash Display', sans-serif", fontWeight: 700, fontSize: 28, color: "white",
        boxShadow: `0 6px 20px ${signal}33`,
      }}>S</div>
      <div style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 700, fontSize: 20, color: jet }}>Shivam Singhal</div>
      <div style={{ fontSize: 11, color: dim, marginTop: 3 }}>Mumbai, India</div>
    </div>
    {/* Stats */}
    <div style={{ display: "flex", margin: "0 18px", background: card, borderRadius: 10, overflow: "hidden" }}>
      {[
        { n: "248", l: "Followers" },
        { n: "182", l: "Following" },
        { n: "15", l: "Races" },
      ].map((s, i) => (
        <div key={s.l} style={{ flex: 1, textAlign: "center", padding: "14px 0", borderLeft: i > 0 ? `1px solid ${divider}` : "none" }}>
          <div style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 700, fontSize: 18, color: jet }}>{s.n}</div>
          <div style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: dim, marginTop: 2 }}>{s.l}</div>
        </div>
      ))}
    </div>
    {/* Details */}
    <div style={{ margin: "18px", padding: 14, background: card, borderRadius: 10 }}>
      <div style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: dim, marginBottom: 10 }}>Details</div>
      {[
        { l: "Gender", v: "Male" },
        { l: "Birthdate", v: "Aug 12, 1996" },
        { l: "Weight", v: "72 kg" },
        { l: "Member Since", v: "Mar 2026" },
      ].map((d, i) => (
        <div key={d.l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 12, borderTop: i > 0 ? `1px solid ${divider}` : "none" }}>
          <span style={{ color: dim }}>{d.l}</span>
          <span style={{ color: jet, fontWeight: 500 }}>{d.v}</span>
        </div>
      ))}
    </div>
    {/* Ribbon */}
    <div style={{ overflow: "hidden", background: jet, padding: "7px 0" }}>
      <div style={{ display: "flex", whiteSpace: "nowrap", fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.25em", color: "rgba(245,240,235,0.25)" }}>
        <span style={{ padding: "0 16px" }}>Run · Discover · Connect · Repeat ·</span>
        <span style={{ padding: "0 16px" }}>Run · Discover · Connect · Repeat ·</span>
      </div>
    </div>
    <div style={{ padding: "14px 18px" }}>
      <div style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 12, textTransform: "uppercase", padding: "10px 0", background: jet, color: "white", borderRadius: 10, textAlign: "center", marginBottom: 8 }}>Settings</div>
      <div style={{ fontSize: 12, color: dim, textAlign: "center", padding: "8px 0" }}>Sign Out</div>
    </div>
  </PhoneFrame>
);
