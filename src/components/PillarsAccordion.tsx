'use client';

import Link from 'next/link';
import { useState, type CSSProperties } from 'react';

type Panel = {
  num: string;
  name: string;
  vertical: string;
  bg: 'bg-red' | 'bg-jet' | 'bg-bone';
  image: string;
  position?: string;
  filter?: string;
  soon?: boolean;
  title: string;
  sub: string;
  href: string;
  cta: string;
};

const PANELS: Panel[] = [
  {
    num: '01',
    name: 'Races',
    vertical: 'Races',
    bg: 'bg-red',
    image: "url('https://images.pexels.com/photos/18409405/pexels-photo-18409405.jpeg?auto=compress&cs=tinysrgb&w=1600')",
    position: 'center 22%',
    filter: 'brightness(0.40)',
    title: 'Find your next\nstart line.',
    sub: 'Discover 500+ running events across 25+ Indian cities. Marathons, half marathons, 10Ks, 5Ks, trail runs — all filterable, all RSVPable, all free.',
    href: '/races',
    cta: 'Browse races →',
  },
  {
    num: '02',
    name: 'Runners',
    vertical: 'Runners',
    bg: 'bg-jet',
    image: "url('https://images.unsplash.com/photo-1771166388723-7b418d91e734?w=1600&q=80&auto=format&fit=crop')",
    position: 'center 10%',
    title: 'Connect with the\npeople who run India.',
    sub: "Follow runners in your city. See who's racing where. Show up knowing familiar faces will be there.",
    href: '/runners',
    cta: 'Meet runners →',
  },
  {
    num: '03',
    name: 'Clubs',
    vertical: 'Clubs',
    bg: 'bg-bone',
    image: "url('/images/clubs.png')",
    position: 'center 30%',
    title: 'Join a run club\nbuilt for your pace.',
    sub: 'Find verified clubs near you — training groups, weekend long-run crews, beginner-friendly pods. Your crew is out there.',
    href: '/clubs',
    cta: 'Find a club →',
  },
  {
    num: '04',
    name: 'Workout Plan',
    vertical: 'Training',
    bg: 'bg-jet',
    image: "url('/images/workout-plan.png')",
    position: 'center 30%',
    soon: true,
    title: 'Training that adapts\nevery week.',
    sub: 'Plans that read your Health Connect data and adjust on Sunday night based on how you actually ran. Powered by Kip.',
    href: '/workout-plan',
    cta: 'Get early access →',
  },
  {
    num: '05',
    name: 'Coaches',
    vertical: 'Coaches',
    bg: 'bg-red',
    image: "url('https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1600&q=80&auto=format&fit=crop')",
    filter: 'brightness(0.40)',
    soon: true,
    title: "Human coaches, when\nyou're ready to level up.",
    sub: 'Work with verified coaches in your city. Get a training plan tailored to your goal, your body, your life.',
    href: '/coaches',
    cta: 'Join waitlist →',
  },
];

const PillarsAccordion = () => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const handleClick = (e: React.MouseEvent, i: number) => {
    if ((e.target as HTMLElement).closest('a')) return; // let CTA links navigate
    setActiveIdx((prev) => (prev === i ? null : i));
  };

  return (
    <section className="v1-pillars">
      <div className="v1-pillars-header">
        {/* <div className="v1-pillars-kicker">The five pillars</div> */}
        <h2 className="v1-pillars-title">
          Races, runners, clubs, training,<br />and coaches. One <b>app.</b>
        </h2>
      </div>

      <div className={`v1-accordion ${activeIdx !== null ? 'has-active' : ''}`}>
        {PANELS.map((p, i) => {
          const bgStyle: CSSProperties = {
            backgroundImage: p.image,
            ...(p.position && { backgroundPosition: p.position }),
            ...(p.filter && { filter: p.filter }),
          };
          return (
            <div
              key={p.num}
              className={`v1-acc-panel ${p.bg} ${activeIdx === i ? 'is-active' : ''}`}
              onClick={(e) => handleClick(e, i)}
            >
              <div className="v1-acc-panel-bg" style={bgStyle} />

              {/* Collapsed: number top-left, name (mobile-only) inline, SOON pill right */}
              <div className="v1-acc-label">
                <span className="v1-acc-num">{p.num}</span>
                <span className="v1-acc-name">{p.name}</span>
                {p.soon && <span className="v1-acc-soon">Soon</span>}
              </div>

              {/* Desktop: vertical rotated label at bottom center */}
              <div className="v1-acc-vertical">{p.vertical}</div>

              {/* Expanded content */}
              <div className="v1-acc-expanded">
                <div className="v1-acc-exp-top">
                  <span className="v1-acc-exp-num">{p.num}</span>
                  {p.soon && <span className="v1-acc-soon">Soon</span>}
                </div>
                <div>
                  <h3 className="v1-acc-exp-title">
                    {p.title.split('\n').map((line, j, arr) => (
                      <span key={j}>
                        {line}
                        {j < arr.length - 1 && <br />}
                      </span>
                    ))}
                  </h3>
                  <p className="v1-acc-exp-sub">{p.sub}</p>
                  <Link href={p.href} className="v1-acc-exp-cta">{p.cta}</Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default PillarsAccordion;
