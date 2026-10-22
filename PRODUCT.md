# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Coworkers at VNG playing together during breaks and team-building sessions. They mostly know each other and often play in the same room or on a call, talking out loud while the game runs; the in-game chat is the record and the channel for night/dead talk. Desktop and phone matter equally: some join from their work laptop, others from their phone.

## Product Purpose

Ma Sói Online is a browser werewolf (social deduction) game for 4–16 players, inspired by Wolvesville. Success is a group starting a room in under a minute, everyone understanding their role and what to do each phase without explanation, and the game producing memorable moments (reveals, deaths, wins) the group talks about afterward.

## Positioning

A private, self-hosted werewolf room for a team that already knows each other: no ads, no install, no shop — every outfit is free — and the host can fill empty seats with bots.

## Operating Context

- Flow: register a character (name + password) → dress the avatar → quick play / create room / join by 4-letter code → lobby (host adds bots, starts) → night / day discussion / vote cycles → results.
- 27 roles across village, wolf, and solo teams; abilities are used by choosing a skill then tapping players.
- Phases are timed (default night 45s, day 60s, vote 30s; admin-configurable).
- Admin site lives on a separate host and is out of scope for the game UI.

## Capabilities and Constraints

- Static `public/index.html` + `public/shared.js` (roles, avatar items, SVG avatar renderer) served by a zero-dependency Node server; no build step. Realtime via Server-Sent Events.
- Avatars are layered SVG with slots: skin, hair, hair color, eyes, mouth, shirt, hat, glasses, mask, held item, background, gravestone; 14 one-click outfit sets. All free, by user decision (no currency or shop).
- Vietnamese UI copy.
- Deployed on Dokploy at a traefik.me HTTP domain; must run on phones and laptops equally.

## Brand Commitments

- Name "Ma Sói" and Vietnamese language stay.
- Character art may be redrawn if it serves a new direction.
- The in-game screen should look and play like Wolvesville's in-game layout (user-provided reference: https://www.youtube.com/watch?v=S998C9Ln2i8): 4x4 grid of player tiles on a sky/pine backdrop, chat under the grid, timer title bar, full-screen role reveal. Imitate layout and conventions only; never copy Wolvesville art, logos, or names. This replaced the earlier "village group chat" direction (user decision, 2026-10-22).

## Evidence on Hand

No real player screenshots, testimonials, or stats exist yet; do not fabricate them.

## Product Principles

1. Every phase must make "what do I do now" obvious at a glance — the group is talking, not reading.
2. Drama is the payoff: reveals, deaths, and wins deserve a moment.
3. Fast in, fast again: starting or restarting a room is never more than one or two taps.
4. Equal on phone and desktop.
