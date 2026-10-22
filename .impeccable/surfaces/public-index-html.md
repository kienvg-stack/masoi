---
version: 1
slug: "public-index-html"
primary_target: "public/index.html"
related_targets: []
---

Scope: the whole player-facing game app in public/index.html (auth, home, wardrobe, roles, in-game board, ability FX, results). Visitor mode: Experience (inside the game), with Operate discipline on the in-game board.

Audience/job: VNG coworkers playing werewolf on break, half on phones, half on laptops, talking out loud. Each phase must say what to do at a glance. Drama (deaths, reveals, wins) gets a moment.

Constraints: keep every element id and JS behaviour the client logic depends on; Vietnamese copy; no emoji in UI chrome; never copy Wolvesville art, logos or names, only its layout conventions.

## Direction contract

THESIS: The user pinned the category standard: play exactly like Wolvesville's in-game screen, executed at full craft. Refuses the earlier group-chat concept and any decorative reinterpretation of the board.

OWN-WORLD: Sky tiles #79c3e6 with dark pine-and-hill silhouettes, night tiles slate #44526e; signature pink #d81b60 for system lines, own name and primary buttons; chat panel light gray #eceef1 by day, #262a33 by night; white bold tile labels with soft shadow; wooden vote sign #8a5a2e; Be Vietnam Pro throughout, Bricolage Grotesque for titles and the role reveal.

STORY: Players read the title bar for phase and seconds left, scan the 4x4 grid to see who is alive, voted on, or talking (speech bubbles), argue in the chat under the grid, and tap tiles to vote or use abilities.

FIRST VIEWPORT: Title bar (X, phase + seconds, ?), 4x4 tile grid, chat panel below with event banners, ability pills and message input docked at the bottom. Desktop puts the grid left and the chat right at equal prominence.

FORM: Canon (user-pinned reference clip), replacing seed c91f3cd5's assigned direction. Signature moments: full-screen role reveal at game start, wooden vote signs on tiles, speech bubbles above talking players.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
