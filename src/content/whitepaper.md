# Kip: The Hyperlocal AI Running Coach
### A methodology paper

**Endorfin Research · Working Paper No. 1**
**Author:** Shivam Singhal, Founder, Endorfin (Ultragon Ventures (OPC) Private Limited)
**Date:** May 2026
**Status:** Pre-publication draft. Domain expert review pending.

---

## Abstract

This paper describes the methodology behind Kip, an AI-augmented running coach designed for runners training in non-temperate, high-pollution environments without consistent access to wearable devices or gym infrastructure. Kip is built on six methodological commitments: (1) established training frameworks as the structural base, with AI used for adaptation rather than plan invention; (2) framework selection calibrated to user goal — Galloway's run-walk methodology for beginners, Higdon for first-time half-marathon, Daniels' VDOT and Pfitzinger structures for pace improvement, masters-specific protocols for older athletes; (3) daily environmental adaptation against weather, temperature, and air-quality thresholds drawn from published exercise-physiology guidance; (4) substitution workouts that assume *no equipment access* by default, with progressively richer alternatives unlocked when the runner reports equipment availability; (5) manual perceived-effort logging as a first-class signal across all goals — including pace improvement — with wearable data treated as a useful enrichment rather than a requirement; and (6) cascade-aware adaptation that prioritises runner safety over plan adherence and target finishing time. Every plan includes structured dynamic warm-ups and cool-downs, age-calibrated where applicable. Kip's product is being built in two parallel tracks: v1 (first 5K, 5K-to-10K, first half-marathon) for beginner runners, and v2 (pace improvement on a known distance, masters-specific programmes) for experienced runners. Both share methodological infrastructure; the framework layer differs by goal.

---

## 1. The methodological problem

Running training plans available to recreational runners today fall into three categories, and each fails differently for runners in environments where Kip is designed to operate.

**Static plans** (Hal Higdon, NHS Couch-to-5K, generic event-prep templates). These prescribe a fixed week-by-week progression with no adaptation. They are popular and accessible, but they fail when conditions change. The most-used static plan, Couch-to-5K, has been studied: a 2023 peer-reviewed analysis stated explicitly that "there is no empirical evidence to support the design of Couch-to-5k" (PMC10487403, 2023). In a tracked cohort, only 27.3% of participants completed it.

**Wearable-tied adaptive plans** (Strava-Runna, Garmin Coach, Apple Fitness+, TrainingPeaks-style coaching). These adapt based on completed-workout data captured by a watch or sensor. They work well for runners with that infrastructure but assume the runner has it. India's wearable penetration is approximately 5–8% of the population, against 40%+ in the markets where these products were designed. A product that requires a wearable cannot serve the modal Indian runner — beginner or advanced.

**Ungrounded LLM plans** (ChatGPT, Claude, or similar prompted to generate a training plan). Increasingly common since 2023. These produce plausible-looking but inconsistent outputs: progression errors, hallucinated pace targets unanchored to the runner's actual fitness, no environmental context, no persistent state across sessions, and no feedback signal to improve future plans.

A fourth implicit failure mode is shared by most plans regardless of category: they assume infrastructure the runner may not have. Substitute workouts default to "treadmill" or "stationary cycling," both of which require a gym or home equipment. For a runner in a tier-2 Indian city, or an older runner without nearby gym access, these substitutes are not actionable.

A fifth failure mode is specific to advanced-runner products: most assume the runner is young, fit, and recovers like a 25-year-old. Masters runners (>35, with sharper considerations >50) have specific physiological profiles — slower recovery, particular protein and strength-training requirements — that generic adult-oriented plans do not address. Masters runners are a meaningful and growing segment in every market, including India.

Kip addresses all five failure modes: established frameworks at the base (vs. ungrounded LLM), AI as adapter (vs. static plan), manual logging as primary input (vs. wearable-required), equipment-free alternatives as the default substitution path (vs. gym-assumed), and explicit masters-specific protocols where the user's age and recovery profile warrant them.

---

## 2. The six methodological commitments

### 2.1 Established frameworks as the base; AI as adapter, not author

Kip never generates training plans from scratch. Every plan begins with an established framework that has decades of empirical use. The AI customises pace targets, adjusts workout intensity for environmental conditions, swaps workout types within preserved training intent, and adapts week-to-week based on logged perceived effort. The macro-cycle structure is inherited from the base framework and preserved.

This is the central methodological distinction from ungrounded LLM-generated plans. It also bounds plan quality: if the base framework is sound, Kip's output is sound. Choosing the right base framework per user goal is therefore the most consequential decision in the methodology.

### 2.2 Framework selection by goal

Different goals require different frameworks. Kip uses four:

**Galloway run-walk for beginners** (first 5K, 5K-to-10K, first 10K). Hottenrott et al. (2016), in the *Journal of Science and Medicine in Sport*, compared marathon runners using continuous running versus those using the run-walk method. The two groups finished with similar times, but the run-walk group reported significantly less muscle pain and lower injury markers. Walking breaks reduce per-stride impact loading by approximately 15–20% and preserve glycogen by reducing metabolic cost during walk intervals. For beginners, whose injury rates are documented at approximately 17.8 per 1,000 hours — more than double that of experienced runners (PMC4473093, 2015) — the load-reduction case is direct. Run-walk intervals also suit Indian environmental conditions: heat increases physiological strain on continuous running by 12–17% (PMC12252039, 2025), and walk breaks reduce that strain.

**Higdon for first-time half-marathon.** Higdon's framework has the widest track-record at this distance for beginners and tolerates week-to-week life disruption better than higher-volume plans (Pfitzinger, Daniels) which assume 30+ miles/week of established base. Galloway run-walk intervals can be layered on Higdon's structure at the runner's option.

**Daniels' VDOT system for pace improvement.** For runners with a known event time who want to run that distance faster, Kip uses Jack Daniels' VDOT methodology to derive personalised pace zones from current fitness, with structured tempo, threshold, interval, and repetition work to drive specific physiological adaptations. The 2018 evaluation in the *Journal of Strength and Conditioning Research* (PubMed 28426511) found VDOT's predictions to be conservative — it tends to underestimate VO2max — which fits Kip's safety-first philosophy. Pfitzinger's structures are used for runners with stronger weekly volume (35+ miles/week) who can absorb higher training load.

**Masters-specific protocols (>35, with sharper adjustments >50).** The Moore (2021) review in *Sports Medicine* established that masters athletes — meaning trained athletes over 35 — are physiologically closer to younger athletes than to untrained older adults. They do not show the anabolic resistance of sedentary aging; their muscle response to training and protein is largely preserved. However, they do require longer recovery between hard sessions, more deliberate strength work to preserve muscle mass, and elevated daily protein intake (~1.6 g/kg/day, vs. 0.8 g/kg/day for the general population). Kip's masters protocol layers these adjustments onto the chosen base framework: longer easy-day recovery between hard sessions, mandatory strength sessions twice per week, age-calibrated warm-up and cool-down, and explicit protein-intake reminders for runners who opt into nutrition guidance.

The masters protocol is not a separate plan — it is a calibration applied to whichever base framework the runner's goal selects. A 60-year-old training for first 5K gets Galloway with masters calibration. A 50-year-old chasing a 10K PR gets Daniels' VDOT structure with masters calibration. The framework matches the goal; the calibration matches the runner.

### 2.3 Daily environmental adaptation

Each morning, Kip evaluates the runner's planned workout against current and forecast conditions for their location. Decisions follow published exercise-physiology thresholds:

| Condition | Threshold | Action |
|---|---|---|
| PM2.5 > 100 μg/m³ | Always | Substitute equipment-free or indoor alternative |
| PM2.5 25–100 μg/m³ | High-intensity workouts | Substitute indoor; for easy runs, suggest later in day |
| Temperature > 38°C | Always | Substitute regardless of time |
| Temperature > 35°C | Midday/afternoon planned | Move to early morning or substitute |
| Active rain >5mm/hr or lightning | Always | Cancel outdoor; reschedule or substitute |

The PM2.5 thresholds derive from published research: 100 μg/m³ from Pasqua et al. (2018), "the beneficial effects during exercise will be mitigated in PM2.5 > 100 μg/m³"; 25 μg/m³ from a 2025 cohort analysis of more than one million adults (UCL et al., 2025). Temperature thresholds reflect controlled studies showing 12–17% performance decline above 35°C (PMC12252039, 2025; James et al., 2017).

For runners doing high-intensity work (interval, threshold, VO2max sessions), the adaptation logic is stricter. These workouts cannot be reasonably "downgraded" to easy effort the way an outdoor easy run can — the training intent is the high-intensity stimulus itself. When environmental conditions force a substitute, the workout is moved (to a different day, indoors, or to a future week) rather than diluted. This matters more for v2 users than v1 users, where most workouts are easy-pace and substitute more flexibly.

When a workout is substituted, the runner sees the reasoning explicitly: *"AQI in your area is 168, above the threshold where outdoor running is recommended in published guidance. We've moved today's session to a home-based alternative with the same training intent."*

### 2.4 Equipment-free substitution by default

Most apps' substitute workouts assume a treadmill, a stationary bike, or at minimum a gym. In India, this assumption fails for a meaningful share of users. For these users, "30 minutes on a treadmill" is functionally a skipped day.

Kip's substitution library is structured around three tiers, surfaced based on what the runner has reported as available:

**Tier 1 — No equipment, any space.** Bodyweight exercises, plyometrics, mobility work, isometric holds. Examples: bodyweight squats (or mini-squats / chair-assisted squats for older or injured runners), reverse lunges (or stationary half-lunges with chair support), step-ups using a stair, calf raises, glute bridges, plank holds, wall sits, marching in place at varied tempos, jumping jacks (if joint-tolerant), skipping rope. Substitutes easy runs, recovery sessions, and most strength sessions.

**Tier 2 — Resistance bands or basic home gear.** Adds banded squats, banded rows, banded lateral walks, tempo work using a sturdy chair or step, and progression on Tier 1 movements with added resistance.

**Tier 3 — Gym or home cardio equipment.** Treadmill, stationary bike, rowing machine, elliptical. Used for substitutions where sustained cardiovascular work is the training intent — most often long-run or interval substitutions, where bodyweight work is not a feasible swap.

Kip asks once during onboarding what the runner has access to. The system then chooses substitutions that fit the runner's environment. A runner who reports no equipment receives a fully usable plan.

The choice of bodyweight exercises is calibrated for safety and age-appropriateness. The CDC recommends bodyweight exercises as the starting point for older adults (CarePartners, 2025; UCLA Health, 2026), with mini-squats and chair- or wall-supported lunges preferred for those over 60. Full bodyweight squats and full lunges are reserved for runners under 50 with no relevant joint history; older runners default to assisted or partial-range variants until perceived effort and progress signals indicate readiness.

### 2.5 Warm-ups and cool-downs as structural

Every Kip workout — outdoor run, indoor substitute, or strength session — includes a structured warm-up and cool-down. These are part of the prescribed workout duration and shown to the runner as such, not optional add-ons.

The literature supports this in nuanced form. The Van Mechelen et al. (1993) randomised trial found that warm-up + cool-down + stretching did not reduce overall running injury incidence — but the intervention was a generic, low-quality warm-up by modern standards. More recent research (PMC12034053, 2024) supports **dynamic warm-ups specifically** for injury prevention and performance, and is consistent in finding that pre-run static stretching is unhelpful or mildly counterproductive.

**Warm-up — 5 to 10 minutes, dynamic.** Light walking or gentle marching to raise heart rate, followed by dynamic movements: leg swings, hip circles, walking lunges or knee hugs, butt kicks at very low intensity, ankle rolls. For older runners, higher-impact movements are substituted with seated or standing mobility work. For runners doing high-intensity workouts, the warm-up extends to 12–15 minutes and includes 4–6 strides at the target session pace to prepare the neuromuscular system.

**Cool-down — 5 to 10 minutes, gentle.** Slow walking until heart rate returns toward baseline, followed by easy static stretching (post-run is the right time for static stretching, unlike pre-run): standing quadriceps stretch, hamstring stretch, calf stretch against a wall, hip flexor stretch.

For older runners, every stretch has a chair-supported or wall-supported variant. The masters protocol extends cool-down duration to 10–15 minutes after hard sessions, on the basis of the slower-recovery profile in the masters athlete literature.

### 2.6 Manual perceived-effort logging as primary input

Because wearable penetration is low — including among advanced Indian runners — manual logging is the primary input pathway across all goal categories. The default logging interaction is one tap: *"How did it feel? [Easier than expected / Just right / Harder than expected / Skipped]"*. Optional fields (distance, time, pace, HR, perceived effort 1–10, notes) expand for runners who have the data but are never required.

The four-state perceived-effort scale is a simplified version of the Borg RPE scale (Borg, 1982), validated as a robust proxy for actual physiological strain across decades of exercise-physiology research.

For v2 users (pace improvement, masters): perceived effort is genuinely sufficient as the primary signal, even for structured threshold and interval work. The runner attempting threshold pace based on Daniels' VDOT can self-report whether the session felt comfortably hard (correct effort), genuinely hard (too fast), or easier than expected (recalibration upward warranted). This is how human coaches calibrate athletes who don't wear watches; Kip applies the same logic. Wearable data, when present, enriches the signal — but does not replace it.

This is a deliberate methodological commitment. Wearable-required products have larger data inputs but smaller addressable populations. Kip optimises for the larger population.

### 2.7 Cascade-aware adaptation with safety as the binding constraint

When environmental conditions force a workout to change, the consequences ripple through the rest of the plan. A missed long run is a missed week of specific aerobic adaptation, not a missed Sunday. Kip's adaptation logic, when a workout is downgraded or replaced:

1. Identifies what training intent was lost.
2. Searches for safe windows to recover the lost stimulus, either elsewhere in the same week or by carrying load forward to the next week with a smaller-than-usual progression.
3. Restructures the remaining week, not the remaining plan. Catastrophic re-planning is avoided.
4. Communicates the tradeoff explicitly: *"This week's long run has been moved. This may add 3–5 minutes to your final half-marathon time but significantly reduces injury risk."*

The constraint that bounds these decisions is **safety, not target time.** Beginner runners are chasing finish lines; advanced runners are chasing PRs. In both cases, the cost of being slightly under-prepared is a slower finishing time. The cost of injury is missing the event entirely or, for masters runners, a longer return-to-running timeline than younger athletes face.

In extreme cases — multiple missed long runs across consecutive weeks, persistently elevated perceived-effort signals, masters runners whose recovery markers indicate accumulated fatigue — Kip is designed to recommend a goal change. Drop from half-marathon to 10K. Push the target PR to the next event. Hold the current VDOT band rather than progress. These messages are difficult but are what a responsible coach would offer.

---

## 3. Illustrative user cases

The following cases describe how Kip's methodology operates for distinct user cohorts. The first two are within v1 scope; the third and fourth are in v2, currently in parallel development.

### 3.1 Priya, 60 — first 5K, no prior running, no equipment (v1)

Priya lives in a Bengaluru apartment. She walks for 30 minutes most mornings but has never run. Her cardiologist cleared her for moderate exercise; she has decided to train for a 5K event 16 weeks away. She has no wearable. She has no gym membership and reports "no equipment, flat space at home" during onboarding. Her training availability is four mornings per week.

**Plan generated.** Kip selects a 16-week run-walk progression based on Galloway's Beginning Runner methodology, with **masters-protocol calibration applied** because she is over 50. Week 1 prescribes 30-second running intervals separated by 90-second walks, repeated for 20 minutes. The intervals progress slowly: 1-minute runs by Week 4, 2-minute runs by Week 8, sustained 5-minute runs by Week 12. The 5K target is at Week 16 with a continuous 25–30 minute run-walk pace.

**Masters calibration in practice.** Because Priya is 60, two masters-specific adjustments are applied automatically:
- **Recovery days are extended.** Where a younger runner might have 2 hard days separated by 1 easy day, Priya's plan separates harder sessions by 2 easy days. This reflects the slower-recovery profile in the masters athlete literature.
- **Strength is mandatory, twice per week.** Two weekday sessions per week include 15 minutes of bodyweight strength, scaled for her age and equipment. Week 1: 8 chair-supported sit-to-stands (a foundational older-adult movement validated by CDC guidelines), 8 wall push-ups, 10 calf raises holding the chair, 30-second wall sit, 8 standing marches per side. Progression is gradual; full bodyweight squats and full lunges are not prescribed at her age.

**Warm-up and cool-down.** Each session opens with a 7-minute dynamic warm-up calibrated for her age: 2 minutes brisk walking, ankle pumps, seated marches, gentle hip circles holding a chair, slow standing leg swings with chair support, walking lunges replaced with chair-supported stationary half-lunges. Each session closes with a 10-minute cool-down (extended for masters): slow walking to bring heart rate down, then static stretches with chair or wall support.

**Adaptation in practice.** On a Tuesday in Week 6, Bengaluru's AQI rises to 145 due to construction smoke nearby. Kip swaps her planned 25-minute run-walk for a 25-minute home-based session: 5-minute dynamic warm-up, 15 minutes of marching-in-place at varied tempos with mini-squat intervals every 90 seconds (matching the run-walk structure), 5-minute cool-down.

**Why this matters for Priya.** A static C25K plan would prescribe 60-second runs in Week 1, no strength work, no masters calibration, no warm-up structure. For a 60-year-old beginner, the masters-calibrated Galloway approach is the difference between sustainable progression and the early-dropout pattern documented in beginner-runner research.

### 3.2 Arjun, 20 — 10K to first half-marathon, partial gym access (v1)

Arjun lives in Delhi NCR. He completed his first 10K six months ago in 58 minutes. He has registered for the Vedanta Delhi Half Marathon, 14 weeks away. He runs three to four times per week. He has an Apple Watch he uses inconsistently and reports gym access during onboarding, with the note that gym access is intermittent.

**Plan generated.** Kip selects Higdon's Half Marathon Novice 1 as the structural backbone, calibrated to his recent 10K time. The plan prescribes a 14-week build with a peak long run of 16K in Week 12. Kip offers Arjun the Galloway run-walk option: he declines for weekday runs but accepts it for Sunday long runs above 12K. Pace targets are derived from his 10K time using Daniels' formulas.

**Warm-up, cool-down, strength.** Each run includes a 10-minute dynamic warm-up and 10-minute cool-down. Two strength sessions per week, 25 minutes each, on his rest days. Default is bodyweight; when he has gym access, dumbbell variants are surfaced.

**Adaptation in practice.** Delhi's AQI begins climbing in late October. On a Sunday in Week 9, the forecast shows AQI 168 in the morning. Kip applies cascade-aware adaptation: downgrade to a 75-minute easy treadmill run (using gym access), restructure Tuesday and Thursday to compensate, hold Week 10's long run at 14K rather than progressing. Arjun sees: *"This Sunday's air quality forced us indoors. We've held your long run progression for one week to keep your training safe. This adds approximately 2–3 minutes to your projected finishing time."*

### 3.3 Vikram, 35 — improving 10K pace from 50:00 to 45:00 (v2)

Vikram lives in Mumbai. He has been running consistently for three years. His 10K personal best is 50:23. He wants to break 45:00, with a target event in 16 weeks. He is fit, injury-free, and reports having a Garmin watch and a home gym during onboarding. At 35, he is at the entry of the masters athlete window.

**Plan generated.** Kip selects Daniels' VDOT methodology. His current 10K time of 50:23 yields VDOT ~42. From this anchor, Kip derives personalised pace zones: easy pace 5:55–6:10/km, threshold pace 4:55/km, interval pace 4:35/km, repetition pace 4:15/km. The plan prescribes a 16-week build:

- Weeks 1–4: aerobic base build, mostly easy runs, one weekly threshold session of 20 minutes
- Weeks 5–10: intensity introduction, threshold sessions extend to 30–35 minutes, VO2max intervals introduced (3–5 minute repeats with equal recovery)
- Weeks 11–14: event-specific work, including 10K-specific tempo runs at goal pace
- Weeks 15–16: taper

**Light masters calibration.** At 35, Vikram is at the early edge of the masters window. Calibration is light but present: a slightly extended cool-down after hard sessions, a recommendation to consume protein within the post-workout window (~0.3 g/kg), and explicit recovery-day enforcement (no back-to-back hard days, even if he reports feeling good).

**Strength.** Two sessions per week, 30 minutes each. Default uses his home gym: goblet squats, deadlifts, single-leg work, core. Bodyweight alternatives are always shown for travel days. The sessions are positioned to support running rather than fatigue him: not in the 24 hours before a hard run, not in the 24 hours after.

**Logging — manual primary, Garmin enriching.** Despite owning a Garmin, Vikram is asked the same one-tap perceived-effort question after every workout. His Garmin data — pace, HR, time — is auto-imported when available and shown alongside, but the perceived-effort signal is the primary input to weekly recalibration. If his Garmin shows the threshold session was run at the prescribed pace but he reports "harder than expected," Kip treats that as a signal of accumulated fatigue, not a mismeasurement.

**Adaptation in practice.** Mumbai's monsoon arrives in Week 6. Three consecutive scheduled tempo runs face heavy rain and slick roads. Kip's environmental adaptation logic for high-intensity workouts is stricter than for easy runs — these cannot be diluted to easy effort without losing the training intent. Two of the three are moved indoors (treadmill threshold work, with explicit pace targets matching his outdoor zones). The third is rescheduled to the following week; Kip restructures Week 7 to absorb the missed session without compounding load.

In Week 11, Vikram logs three "harder than expected" entries across his interval sessions. His Garmin shows he's hitting the prescribed paces but his HR is running 8–10 bpm above expected. Kip flags this: *"Your effort signals are running higher than your pace targets suggest. We're going to ease back the intensity for one week — this is how plateaus happen, and we want to avoid one."* His VDOT is held at 42 rather than nudged up. Daniels' guidance — to progress VDOT no more than one point per training cycle — directly informs this conservatism.

**Why this matters for Vikram.** A wearable-tied product would have used his Garmin data to confirm he was hitting paces and pushed him forward. Kip's perceived-effort-primary logic catches the underlying fatigue signal that pace data alone misses. The masters calibration, even at 35, prevents the overtraining that often derails recreational PR attempts.

### 3.4 Ravi, 52 — masters runner, 10K under 50 minutes (v2)

Ravi lives in Hyderabad. He has been running for ten years. His 10K PB is 51:45, set three years ago. He wants to break 50 minutes for the first time, with a target event 14 weeks away. He runs four times per week, has stayed injury-free for eighteen months, and has a basic home setup (resistance bands, no full gym).

**Plan generated.** Kip selects Daniels' VDOT methodology, anchored to his 51:45 10K (VDOT ~41), with **full masters calibration applied** because he is over 50. The plan prescribes a 14-week build, structurally similar to Vikram's but with different volume distribution and recovery cadence:

- Easy/recovery runs are longer; total weekly volume runs lower than a younger runner targeting the same VDOT progression.
- VO2max intervals are limited to 6% of weekly volume (vs. 8–10% for younger runners), reflecting the slower recovery from peak-intensity work in masters athletes.
- Hard sessions are separated by 3 days, not 2.

**Full masters calibration.**
- **Strength is non-negotiable, twice per week.** Ravi gets banded squats, banded rows, single-leg work using his bands, and core. The literature on masters athletes is consistent that strength training is a primary tool against age-related muscle loss and a meaningful contributor to running economy at his age.
- **Protein guidance is surfaced explicitly.** Kip suggests ~1.6 g/kg/day distributed across meals, with a focus on the post-workout window. The Moore (2021) review establishes this as the right target for masters athletes.
- **Recovery-day enforcement is stricter.** If Ravi logs three hard sessions within five days (regardless of how they felt), Kip injects a forced easy day. The rationale is shown to him explicitly: masters athletes accumulate fatigue more silently than younger athletes; a "feels fine" report at 52 is a less reliable signal than at 25.
- **VDOT progression is conservative.** Daniels recommends increasing VDOT no more than one point per training cycle for any runner. For masters, Kip holds the band longer — Ravi might run the cycle at VDOT 41 and only reassess after the goal event, even if his early-week threshold sessions suggest he could be faster.

**Warm-up and cool-down extended.** 12-minute dynamic warm-up before runs, 15-minute cool-down after hard sessions. The literature supports longer warm-ups for older athletes both for injury prevention and for getting the cardiovascular system fully primed.

**Adaptation in practice.** In Week 8, Ravi logs two "harder than expected" entries on what should have been moderate sessions, and his self-reported sleep has been poor for four nights. Kip reads this as masters-specific accumulated fatigue and forces an unscheduled rest day, with a clear explanation: *"At 52, recovery is the workout that doesn't feel like a workout. We're inserting a rest day so your hard sessions next week land properly."* Week 9 is restructured: the planned long run is preserved, but the second hard session of the week is replaced with an easy session.

**Why this matters for Ravi.** Most online plans for "breaking 50 minutes in the 10K" are written for runners in their 20s or 30s. Following them at 52 produces injuries — and the masters literature is explicit that injury rates rise sharply when older runners follow young-runner plans without calibration. Kip's masters calibration is what makes a 10K PR attempt at 52 a sustainable pursuit rather than a six-month rehab project.

The key methodological point: Ravi's plan is not a watered-down young-runner plan. It is a structurally similar plan with calibrations the research supports. Same Daniels framework, different calibration — and the calibration is what matters at his age.

---

## 4. Methodology summary

The six commitments, condensed:

1. Plans begin with established frameworks. Goal selects framework: Galloway for beginners, Higdon for first-time half-marathon, Daniels' VDOT and Pfitzinger for pace improvement, masters calibration overlaid where age warrants. AI customises within those frameworks; AI does not invent new ones.
2. Daily environmental adaptation is bounded by published thresholds for AQI, temperature, and weather. High-intensity workouts have stricter substitution logic than easy runs.
3. Substitutions default to no-equipment alternatives; richer alternatives unlock when the runner reports they are available. No runner is penalised for lacking a gym.
4. Manual perceived-effort logging is the primary input across all user goals — including pace improvement. Wearables enrich but do not replace this signal.
5. Every prescribed session includes a structured dynamic warm-up and gentle cool-down, age-calibrated where applicable.
6. Adaptation cascades through the surrounding training, prioritises safety over target finishing time, and is willing to recommend goal changes when conditions warrant.

---

## 5. Scope and parallel development

Kip is being built in two parallel tracks:

**v1 — beginner runners.** First 5K, 5K-to-10K, first 10K, first half-marathon. Galloway and Higdon frameworks. Equipment-free defaults. Manual logging. Masters calibration applied to runners over 50 in this segment.

**v2 — experienced runners.** Pace improvement on a known distance (5K, 10K, half-marathon PR pursuits). Masters-specific programmes for runners over 35 chasing age-group PRs. Daniels' VDOT and Pfitzinger frameworks. The same equipment-free, manual-logging-primary, environmentally-adaptive infrastructure. Masters calibration applied with greater specificity — protein guidance, recovery-day enforcement, strength-mandatory protocols, conservative VDOT progression.

v1 and v2 share the same methodological infrastructure: environmental adaptation, equipment-tier substitutions, perceived-effort logging, cascade-aware adaptation, structured warm-ups and cool-downs. They differ in framework selection at the base layer.

v1 enters alpha first; v2 will be tested with a smaller cohort in parallel as the framework infrastructure matures. We are not claiming v2 is shippable today; we are claiming the methodology extends and the development is active.

Acknowledged limitations:

- Plan quality is bounded by the quality of the base frameworks. The methodology cannot rescue a runner from an unsuitable framework choice.
- AI customisation requires expert review. We are commissioning a sports-scientist review of all plan outputs during the alpha period, with masters-runner protocols receiving specific scrutiny.
- Manual logging requires honesty. Runners who systematically misreport perceived effort will receive sub-optimal adaptations.
- The framework has not yet been validated through a controlled trial. This paper proposes a methodology based on extant literature; empirical validation is the next step.
- Equipment-free substitutions trade specificity for accessibility. A 75-minute long-run substitute consisting entirely of bodyweight work is structurally different from the planned outdoor run. We accept this trade because the alternative — a "skipped day" recommendation — is worse for adherence than an imperfect substitution.
- Masters protocols are based on the strongest available research (Moore 2021 and related work) but the masters-running literature is smaller than the general adult-runner literature. Calibrations may need refinement based on alpha-phase findings.
- Wearable-based metrics (HR variability, recovery scores, training stress) are richer signals than perceived effort alone. A future v3 may surface optional wearable-integration deeper than current treatment, particularly for advanced users.

---

## 6. Next steps: alpha programmes

Kip's framework will be validated through two alpha programmes running in sequence:

**v1 alpha — 100 Indian runners** across all three v1 goals, in cities representing distinct climate, air-quality, and infrastructure conditions (Delhi NCR, Mumbai, Bengaluru, Hyderabad, Chennai, Kolkata, plus tier-2 cities). Participants receive lifetime free access in exchange for honest logging and feedback.

**v2 alpha — 30 Indian runners** chasing a 5K, 10K, or half-marathon PR, with masters runners over-represented (15 of 30) to stress-test masters calibration. Begins approximately 3 months into the v1 alpha.

We will publish an updated working paper documenting findings — validation, revision, or refutation of the framework — at the end of each alpha period.

To apply: `endorfin.run/coach-waitlist`. Specify v1 (beginner) or v2 (PR pursuit) on the application form.

---

## References

Borg, G. A. (1982). Psychophysical bases of perceived exertion. *Medicine and Science in Sports and Exercise*, 14(5), 377–381.

CarePartners of Connecticut. (2025). *Strength Training for Older Adults*. https://www.carepartnersct.com/wellness/strength-training-older-adults

Daniels, J. (2014). *Daniels' Running Formula* (3rd ed.). Human Kinetics.

Galloway, J. (2010). *Marathon: You Can Do It!* Shelter Publications.

Higdon, H. (n.d.). *Half Marathon Novice 1, Novice 2, and Intermediate Training Plans*. Hal Higdon. https://www.halhigdon.com/training-programs/

Hottenrott, K., Ludyga, S., & Schulze, S. (2016). Walk breaks in marathon running: A study on physiological and perceptive parameters. *Journal of Science and Medicine in Sport*.

James, C. A., Hayes, M., Willmott, A. G. B., Gibson, O. R., Flouris, A. D., Schlader, Z. J., & Maxwell, N. S. (2017). Defining the determinants of endurance running performance in the heat. *Temperature*, 4(3), 314–329. DOI: 10.1080/23328940.2017.1333189

Moore, D. R. (2021). Protein Requirements for Master Athletes: Just Older Versions of Their Younger Selves. *Sports Medicine*, 51 (Supplement 1), S13–S30. DOI: 10.1007/s40279-021-01510-0. https://pmc.ncbi.nlm.nih.gov/articles/PMC8566396/

Pasqua, L. A., Damasceno, M. V., Cruz, R., Matsuda, M., Garcia Martins, M., Lima-Silva, A. E., et al. (2018). Exercising in air pollution: the cleanest versus dirtiest cities challenge. *International Journal of Environmental Research and Public Health*, 15(7), 1502.

Pfitzinger, P., & Latter, P. (2015). *Faster Road Racing: 5K to Half Marathon*. Human Kinetics.

PMC4473093. (2015). Incidence of Running-Related Injuries Per 1000 h of running in Different Types of Runners: A Systematic Review and Meta-Analysis. *Sports Medicine*. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4473093/

PMC8918627. (2022). Physical Exercise in the Context of Air Pollution: An Emerging Research Topic. https://pmc.ncbi.nlm.nih.gov/articles/PMC8918627/

PMC10487403. (2023). "Couch-to-5k or Couch to Ouch to Couch!?" *International Journal of Environmental Research and Public Health*. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10487403/

PMC12028381. (2025). Air Pollution and Endurance Exercise: A Systematic Review of the Potential Effects on Cardiopulmonary Health. https://pmc.ncbi.nlm.nih.gov/articles/PMC12028381/

PMC12034053. (2024). Dynamic Warm-ups Play Pivotal Role in Athletic Performance and Injury Prevention. https://pmc.ncbi.nlm.nih.gov/articles/PMC12034053/

PMC12252039. (2025). Effects of Nutritional Supplements on Endurance Performance and Subjective Perception in Athletes Exercising in the Heat: A Systematic Review and Network Meta-Analysis. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12252039/

PMC12469555. (2025). Air Pollution and Respiratory System Responses in Healthy Adults Engaging in Outdoor Physical Exercise in Urban Environments: A Scoping Review. *International Journal of Environmental Research and Public Health*. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12469555/

PubMed 28426511. (2018). An Evaluation of Time-Trial-Based Predictions of VO2max and Recommended Training Paces for Collegiate and Recreational Runners. *Journal of Strength and Conditioning Research*. https://pubmed.ncbi.nlm.nih.gov/28426511/

Tainio, M., et al. (2016). Can air pollution negate the health benefits of cycling and walking? *Preventive Medicine*, 87, 233–236.

Tandfonline. (2018). Differences in injury risk and characteristics of injuries between novice and experienced runners over a 4-year period. *The Physician and Sportsmedicine*. https://www.tandfonline.com/doi/full/10.1080/00913847.2018.1507410

UCL et al. (2025). Polluted air quietly erases the benefits of exercise. *ScienceDaily*, 28 November. https://www.sciencedaily.com/releases/2025/11/251128050457.htm

UCLA Health. (2026). *Why strength training is critical for older adults*. https://www.uclahealth.org/news/article/why-strength-training-critical-older-adults

Van Mechelen, W., Hlobil, H., Kemper, H. C., Voorn, W. J., & de Jongh, H. R. (1993). Prevention of running injuries by warm-up, cool-down, and stretching exercises. *American Journal of Sports Medicine*, 21(5), 711–719. https://pubmed.ncbi.nlm.nih.gov/8238713/

---

## Disclosures

The author is the founder of Endorfin (Ultragon Ventures (OPC) Private Limited). This paper proposes a methodology that the company intends to commercialise. The underlying research is presented neutrally; the conclusions support the company's product direction.

This is a working paper, not peer-reviewed research. Domain expert review is pending. v1 is in active alpha-readiness development; v2 is in parallel methodology development with a smaller alpha planned to follow v1. Readers are invited to verify cited sources independently and to send corrections or additional relevant literature to `research@endorfin.run`.
