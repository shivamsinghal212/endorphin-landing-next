import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Challenge Terms & Conditions',
  description: 'The terms and conditions that apply to every challenge you join on Endorfin.',
};

const SECTIONS: { h: string; b: string }[] = [
  {
    h: 'Eligibility',
    b: 'Challenges are open to registered Endorfin users with a verified account. You must be 16 or older to join. Endorfin employees and their immediate families are not eligible for cash or gift-card rewards.',
  },
  {
    h: 'How runs qualify',
    b: 'Only runs recorded with the Endorfin app (or synced from a connected health source) count toward a challenge. A run must meet the challenge’s stated distance, duration, or streak criteria to qualify. GPS distance is the source of truth; manual or edited entries may be excluded.',
  },
  {
    h: 'Fair play',
    b: 'Runs must reflect genuine physical activity by the account holder. Spoofed GPS, treadmill emulation reported as outdoor GPS, shared devices, or any attempt to fabricate activity will void your standing and may result in removal from the challenge and forfeiture of rewards.',
  },
  {
    h: 'Rewards & the draw',
    b: 'Completing a challenge enters you into the reward draw for that challenge — finishing is all that is required, and how fast or at what time you run has no bearing on your chances. Where the reward is limited (e.g. 25 gift cards), winners are selected at random from everyone who completes, so every finisher has an equal chance regardless of age, pace, or speed. Winners are announced on the date and channel stated on the challenge (typically Endorfin’s Instagram). Any participation reward stated on the challenge (e.g. a digital certificate) is given to every finisher. Rewards are non-transferable, have no cash-alternative unless stated, and applicable taxes are the recipient’s responsibility.',
  },
  {
    h: 'Timing & time zone',
    b: 'Daily targets, streaks, and deadlines are evaluated in the challenge’s stated time zone. A day runs from local midnight to midnight. A missed day in a streak challenge resets your streak as described on the challenge.',
  },
  {
    h: 'Changes & cancellation',
    b: 'Endorfin may correct errors, adjust standings, or modify, pause, or cancel a challenge if required by technical issues, abuse, or circumstances beyond our control. You may leave a challenge at any time; leaving forfeits any in-progress standing.',
  },
  {
    h: 'Data',
    b: 'Participating shares the run metrics relevant to the challenge (distance, pace, streak, and your display name) with the leaderboard visible to other participants. Your handling of personal data is governed by the Endorfin Privacy Policy.',
  },
  {
    h: 'Liability',
    b: 'You participate at your own risk and are responsible for exercising safely and within your ability. Endorfin is not liable for injury, loss, or damage arising from participation, to the extent permitted by law.',
  },
];

export default function ChallengeTerms() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent transition-colors font-body mb-10">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <h1 className="text-4xl md:text-5xl font-display font-bold uppercase text-foreground mb-8">
          Challenge Terms &amp; Conditions
        </h1>
        <p className="text-sm text-muted-foreground font-body mb-10">
          These terms apply to every challenge you join on Endorfin. Individual challenges may add specific goals, deadlines, and rewards — those are shown on the challenge itself.
        </p>

        <div className="space-y-8 font-body text-muted-foreground leading-relaxed">
          {SECTIONS.map((s) => (
            <section key={s.h}>
              <h2 className="text-xl font-display font-semibold uppercase text-foreground mb-3">{s.h}</h2>
              <p>{s.b}</p>
            </section>
          ))}
          <p className="text-sm italic pt-4">By joining a challenge you confirm you have read and agree to these terms.</p>
        </div>
      </div>
    </main>
  );
}
