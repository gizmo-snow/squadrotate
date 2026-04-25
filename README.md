# SquadRotate

Mobile-first coaching decision support system for youth soccer game day. Automates roster rotation, equal play time tracking, and shift/position assignment so coaches can focus on the game instead of a clipboard.

---

## What It Does

SquadRotate solves the game-day coaching problem: balancing 8-12 kids across 6 shifts, rotating positions fairly, tracking energy levels, and handling absent players — all on a phone screen, in real time, under pressure.

- **Automated rotation logic** — assigns players to roles (Striker, Mid, Defense, Goalkeeper) based on Power Score and shift number using IFS + MOD formula model
- **Equal play enforcement** — tracks shifts played per player, flags over-used or under-used players
- **Absent player handling** — defaults absent players to Bench/Rest without breaking rotation calculations
- **Squad strength audit** — aggregates Power Scores per shift so you can instantly spot weak lineups
- **Visual alert system** — Red = alert/imbalance, Green = balanced, Yellow = warning
- **Dropdown interactions** — tap to assign, no typing required during a game

---

## Tech Stack

- Vanilla JS + HTML/CSS — no framework, no build step, loads instantly
- QUnit test suite — runs via Node CLI, no bundler required
- Local storage — session persistence across refreshes
- No backend, no server — runs entirely in the browser
- Mobile-first layout — designed for Galaxy S22 Ultra, works on any modern phone

---

## Quick Start

```bash
# Run tests
npm test

# Open the app
# Just open index.html in a browser — no build step required
# Or serve locally:
npx serve .
```

---

## Project Structure

```
squadrotate/
├── index.html              ← Main app (entire UI)
├── package.json
├── tests/
│   └── test-*.js           ← QUnit test suite
├── help/                   ← In-app help content
├── docs/                   ← Documentation
├── .gizmobuild/
│   ├── CONTEXT.md          ← Project brief (auto-synced to GizmoBuild Drive)
│   ├── skills-used.md      ← GizmoBuild department skills for this project
│   ├── decisions.md        ← Key architectural decisions log
│   └── scripts/
│       └── sync_to_drive.py ← GitHub Actions Drive sync script
└── .github/
    └── workflows/
        └── sync-context-to-drive.yml ← Auto-syncs .gizmobuild/ to Drive on push
```

---

## Rotation Model

Players have a **Power Score** (skill/experience rating). The system uses this to:

1. Map players to appropriate positions per shift (higher scores → more demanding roles)
2. Rotate players through Goalkeeper duty fairly (MOD logic prevents repeat GK assignments)
3. Flag lineups where total active Power Score falls below threshold (Squad Strength Audit)
4. Track cumulative shift counts to surface over- or under-rotated players

Coaches retain full tactical override — the system is a decision support tool, not an autopilot.

---

## Relationship to Other GizmoBuild Projects

| Project | Layer | Scope |
|---|---|---|
| **SquadRotate** | Coaching tool | Individual team, game day, real-time rotation |
| **Youth Sports League Manager** (planned) | Commissioner tool | League-wide, season planning, scheduling |

These are complementary products serving different users at different timescales.

---

## GizmoBuild

Built and maintained by [GizmoBuild LLC](https://gizmobuild.io) — `brennan@gizmobuild.io`
