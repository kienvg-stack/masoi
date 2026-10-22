---
name: Ma Sói
description: Browser werewolf for coworkers, played on a sky-and-pine tile board over a live chat.
colors:
  sky: "#79c3e6"
  night: "#44526e"
  pink: "#d81b60"
  pink-soft: "#fbd3e0"
  ink: "#1f2430"
  paper: "#f4f5f7"
  white: "#ffffff"
  wood: "#8a5a2e"
  wood-edge: "#5e3b1b"
  mint: "#1fa37a"
  red: "#e5394d"
  orange: "#f08a24"
  soft: "#5d6372"
  panel: "#eceef1"
  line: "#d5d8de"
  event-day: "#dfe2e7"
  ground-night: "#1a1e27"
  fg-night: "#eef0f4"
  soft-night: "#a9afbd"
  panel-night: "#262a33"
  line-night: "#3a404c"
  event-night: "#323845"
  chrome-night: "#12151c"
  pink-night: "#ff7aa6"
  lamp: "#ffd84d"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Be Vietnam Pro, sans-serif"
    fontSize: "clamp(60px, 11vw, 140px)"
    fontWeight: 800
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Bricolage Grotesque, Be Vietnam Pro, sans-serif"
    fontSize: "clamp(32px, 5.5vw, 52px)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0"
  body:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.5
  chat:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "14.5px"
    fontWeight: 500
    lineHeight: 1.4
  label:
    fontFamily: "Be Vietnam Pro, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.3
  numeral:
    fontFamily: "Bricolage Grotesque, Be Vietnam Pro, sans-serif"
    fontSize: "clamp(13px, 1.6vw, 18px)"
    fontWeight: 800
    lineHeight: 1.3
rounded:
  tile: "4px"
  badge: "6px"
  field: "10px"
  card: "12px"
  sheet: "16px"
  pill: "999px"
spacing:
  board-gap: "3px"
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "22px"
components:
  button-primary:
    backgroundColor: "{colors.pink}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "12px 18px"
    typography: "{typography.title}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "12px 18px"
  button-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
  input-field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "12px 14px"
  input-chat:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "42px"
  player-tile:
    backgroundColor: "{colors.sky}"
    textColor: "{colors.white}"
    rounded: "{rounded.tile}"
  vote-sign:
    backgroundColor: "{colors.wood}"
    textColor: "{colors.white}"
    rounded: "{rounded.tile}"
    padding: "3px 8px"
    typography: "{typography.numeral}"
  vote-hand:
    backgroundColor: "{colors.white}"
    textColor: "{colors.pink}"
    rounded: "{rounded.pill}"
    padding: "2px 7px 2px 4px"
  speech-bubble:
    backgroundColor: "{colors.pink-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "3px 7px"
  chat-event:
    backgroundColor: "{colors.event-day}"
    textColor: "{colors.pink}"
    rounded: "{rounded.field}"
    padding: "8px 12px"
  chat-private:
    backgroundColor: "{colors.pink-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
    padding: "1px 6px"
  team-chip-village:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "3px 9px"
  team-chip-wolf:
    backgroundColor: "{colors.red}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "3px 9px"
  team-chip-solo:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    padding: "3px 9px"
  sheet:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "22px"
---

# Design System: Ma Sói

## Overview

**Creative North Star: "The Village Board at Game Time"**

Ma Sói plays like the in-game screen of a mobile werewolf game: a 4x4 grid of player tiles, each a little window onto a sky-blue clearing ringed by dark pines, with the chat running underneath (phone) or beside it (desktop). The layout and conventions follow the user-pinned Wolvesville reference; the art, names and marks are the project's own. Everything is bright, flat, rounded and legible from arm's length, because players are talking out loud and only glance at the screen.

The world has two lighting states. Day is sky tiles, a light gray chat panel and white chrome; night lowers a slate layer over every tile one by one along the diagonal and turns the panels charcoal. One signature pink carries everything the game says to you: system lines, your own name, the primary action, the timer fuse. Team identity is a strict three-colour code (mint village, red wolves, orange solo) worn by role badges, chips and the full-screen reveal.

Drama is staged on the board itself, not in modal chrome: speech bubbles pop over the talker's tile, wooden signs show who each player is voting for, deaths shake and bleed the victim's tile, and dawn sweeps warm light across the grid.

**Key Characteristics:**
- Sky-and-pine tiles on a 3px white (day) or near-black (night) gutter.
- One pink voice; three team colours; everything else neutral.
- Pills for every control, small 4px corners on the board.
- Bust-framed SVG avatars in tiles, full-body avatars everywhere else.
- Phosphor bold icons only.

## Colors

A bright daylight palette with a slate night twin, one hot pink accent and a three-colour team code.

### Primary
- **Signal Pink** (`pink`): the game's voice. Primary buttons, system chat lines, event banner text, your own name on your tile and in chat, the timer fuse, selected/picked outlines, focus rings and text selection. On night panels it lifts to **Night Pink** (`pink-night`) for contrast.
- **Blush** (`pink-soft`): speech bubbles, private-message rows, the input focus halo.

### Secondary
- **Clearing Sky** (`sky`): the tile backdrop, the auth/home/wardrobe hero panels, result portrait frames and seat-number chips. Always paired with the pine-and-hill silhouette strip along the bottom.
- **Slate Night** (`night`): the night layer that covers each tile, with a darker pine strip.
- **Signboard Wood** (`wood`, edged with `wood-edge`): the vote sign and FX props (arrow shaft, rope). Never a general accent.

### Tertiary (team code)
- **Village Mint** (`mint`), **Wolf Red** (`red`), **Solo Orange** (`orange`): role badge tiles, team chips, the role-reveal background, win stamps (mint), wolf-chat tint (red at 16%), kill FX (red). A role's team colour is the only colour its badge may wear.

### Neutral
- **Ink** (`ink`): text on light surfaces, the "on" segmented state.
- **Paper** (`paper`): day page ground, segmented-control track, ability tags, result cards.
- **White** (`white`): day chrome (title bar, board gutter), sheets, inputs, secondary buttons, tile labels.
- **Pewter** (`soft`) / **Mist Panel** (`panel`) / **Hairline** (`line`): secondary text, the chat panel, and 1-1.5px dividers and inset outlines. `event-day` is the event-banner fill on the day panel.
- **Night set**: `ground-night`, `fg-night`, `soft-night`, `panel-night`, `line-night`, `event-night` swap in under `body.night`; `chrome-night` replaces white for the title bar, board gutter and dark drop card. **Lamp** (`lamp`) is the warm yellow for the moon icon, host crown and night drop text.

### Named Rules
**The One Voice Rule.** Pink speaks for the game and for you. It is never decoration, never a team colour, never a background larger than a button.

**The Team Code Rule.** Mint, red and orange mean village, wolves and solo, everywhere. No other component may borrow them for status or ornament.

**The Two Lights Rule.** Every surface defines both a day and a night value through the swapped custom properties; nothing hard-codes a single lighting state.

## Typography

**Display Font:** Bricolage Grotesque (600/800, optical size 12-96), falling back to Be Vietnam Pro
**Body Font:** Be Vietnam Pro (400-700), falling back to system-ui

**Character:** Be Vietnam Pro handles every Vietnamese diacritic cleanly and carries the whole UI, including the in-game title bar. Bricolage Grotesque is the loud, slightly quirky voice reserved for titles, numerals and drama.

### Hierarchy
- **Display** (800, clamp 60-140px, 0.9, -0.04em): the auth wordmark only.
- **Headline** (800, clamp 32-52px, 1.1, -0.03em): screen headings, result verdict, role-reveal name (clamp 36-60px), drop cards ("Đêm 1"), clamp 34-64px.
- **Title** (Be Vietnam Pro 700, 17px; 22px above 900px): the in-game phase title with tabular seconds. Section titles (h3, 21px) use the display face.
- **Body** (500, 15px, 1.5): default text. Chat runs at 14.5px/1.4 (15px on desktop).
- **Label** (700, 12-13.5px): form labels, hints, chips, tile names (13px; 11.5px phone, 14.5px desktop).
- **Numeral** (Bricolage 800): vote-sign digits, hand counts, seat chips, ranks, win stamps.

### Named Rules
**The Numbers Shout Rule.** Seat numbers, vote counts and ranks are set in the display face at 800; prose never is.

**The Vietnamese First Rule.** Every UI string is Vietnamese and every face must render its full diacritic set; do not introduce a face without Vietnamese coverage.

## Layout

**Game screen.** A full-height (100dvh) column, max 1240px: title bar (close X left, phase + seconds and room/alive line centred, help ? right, a 3px pink fuse underneath that shrinks with the timer), then the stage.
- **Desktop (>900px):** board left, chat panel right at equal prominence. Board width is `min(56%, (100dvh - 70px) * 3 / rows)` and its aspect ratio is `3 / rows`, so the grid shrinks to 2 or 3 rows when the room has 8 or 12 players and always fits the viewport.
- **Phone (<=900px):** board stacked over chat; tile row height `min(31vw, (100dvh - 300px) / 4)`. The vote poll is hidden; voting happens by tapping tiles and reading the signs.
- **Board:** 4 columns, 3px gutter and padding. Tile `--i` = column + row drives the diagonal stagger.
- **Chat panel:** scrolling thread (10px 14px padding, 3px line gap), then optional poll, then a dock: hint line, ability pills, composer (role badge 42px, pill input, 42px send button), with safe-area bottom padding.

**Out-of-game screens** (home, wardrobe, roles) share a 1180px container with a wordmark bar and a two-column grid (300-330px sticky art column + content), collapsing to one column at 900px. Auth is a hero/sheet split collapsing the same way.

**Rhythm:** 6/10/14/22px steps; lists use 12-14px row padding.

## Elevation & Depth

Mostly flat with soft ambient shadows on things that sit *on* the board or float above it. Containers on the page use 1.5px inset hairlines rather than shadows. Depth on the board comes from layering (tile, night layer, avatar, labels, badges, bubble) and from soft drop shadows on the props.

### Shadow Vocabulary
- **Button lift** (`0 2px 5px rgba(0,0,0,.2)`): filled buttons.
- **Hairline inset** (`inset 0 0 0 1.5px var(--line)`): secondary buttons, list panels, role cards, wardrobe items.
- **Prop** (`0 3px 6px rgba(0,0,0,.3)`, lighter 0 2px 4-6px variants): vote sign, hand badge, speech bubble, role badge on tiles, claw marks.
- **Float** (`0 2px 8px rgba(0,0,0,.12)`): the vote poll card.
- **Sheet** (`0 18px 40px -16px rgba(0,0,0,.3)`): auth and modal sheets.
- **Drama** (`0 12px 30px rgba(0,0,0,.3)`): drop cards and FX captions.
- **Label halo** (`text-shadow 0 1px 2px rgba(0,0,0,.55)`): white tile names over sky.

### Named Rules
**The Props Cast Shadows Rule.** Only objects placed on a tile or floating over the game cast a shadow; panels and lists are outlined, not lifted.

## Shapes

Three corner families. Controls are full pills (999px): buttons, inputs in the game and join form, chips, team chips, hand badge, segmented track. Containers are softly rounded: 10px for fields, banners and bubbles; 12px for cards, poll, wardrobe items and result actors; 16px for sheets and hero panels. The board is nearly square-cornered: 4px tiles, 4px vote signs, 6px badges, so the grid reads as one panel of windows. Role badges are rounded squares (8px, scaling to 12, 16, 28 and 36px as they grow). The vote sign tilts -3deg and the hand badge -8deg, the only rotated shapes.

## Components

### Buttons
Chunky, friendly pills that press in.
- **Shape:** full pill (999px), 12px 18px, Be Vietnam Pro 700 15px, icon + label with 8px gap.
- **Primary:** pink fill, white text, button-lift shadow.
- **Secondary:** white fill with hairline inset; hover tints to blush (#f7e3ea).
- **Bare:** transparent, hover 14% gray wash; used in the title bar and wordmark bars.
- **On:** ink fill for the selected chip or segment.
- **States:** hover brightness 1.07; active translateY(1px) scale(.98); disabled 45% opacity; focus is a 3px pink outline offset 2px.

### Inputs / Fields
- **Style:** white, 1.5px hairline border, 10px radius (pill in the composer and room-code field), 16px text so phones do not zoom.
- **Focus:** pink border plus a 3px blush halo.
- **Room code:** uppercase, 0.2em tracking, 700.

### Player Tile (signature)
The board's unit, stacked in this order:
- **Backdrop:** sky with the pine silhouette strip; the night layer (slate + darker pines) fades in over it.
- **Name label:** "seat number + name", white 700 with a dark halo, centred at the top, truncated. Your own label is pink with a white halo.
- **Avatar:** bust framing (head and chest, `viewBox -6 -14 132 132`, bottom-aligned) at 88% width, 82% height. Dead players show their chosen gravestone in the same framing.
- **Vote sign:** a wooden board at the bottom centre showing the *seat number this player voted for*, display face 800, tilted -3deg. Visible during vote and night (for wolves).
- **Hand badge:** white pill at top-left under the name, pink pointing-hand icon plus the count of votes *received*, tilted -8deg.
- **Speech bubble:** blush rounded box under the name with the latest message, clamped to two lines, popping in from below.
- **Role badge:** 22px team-coloured rounded square, bottom-right, when the role is known. Lover/target tags sit bottom-left as white squares with pink icons; the host gets a lamp-yellow crown.
- **States:** targetable = 3px white inset ring and 1.03 hover scale; picked = 4px pink inset ring; dead = desaturated (saturate .3, brightness .82) with a struck-through name.
- **Lobby:** the host sees a small white kick button bottom-right.

### Chat Lines
- **Player line:** bold "seat name:" then text. Your name in pink.
- **System line:** pink 700 text, no fill.
- **Event banner:** full-width 10px-radius gray band, pink 700 text left, phase icon right (moon in lamp yellow, sun in amber, scales for vote, dice for start, trophy for end).
- **Private line:** blush row, ink 700 text: secrets for you only.
- **Wolf line:** red at 16% tint with red names.
- **Dead line:** pewter italic.

### Vote Poll (desktop only)
White 12px card above the dock: scales icon, "who to hang", count of votes cast; two-column options with a sky seat chip, name, count, and a pink 18% fill bar proportional to votes. Your choice has a 2px pink ring.

### Role Badge and Team Chip
Role badges are Phosphor bold icons in a team-coloured rounded square; team chips are white-text pills in the team colour. Both appear in the role list, the composer (42px badge opens your role card), tiles and results.

### Role Reveal
Full screen in the player's team colour: a 180px icon frame (6px white border, 36px radius) with a 110px role icon, the role name in display 800, a translucent team chip, the description (max 40ch), and a "game starts now" line. Pops in from scale 1.06, holds 4.2s.

### Results Sheet
Modal sheet (white, 16px, max 820px) over a 60% ink scrim: pink headline verdict, fact row, then a cast grid (124px min) of actor cards: sky-and-pine portrait, name, role badge + team chip, cause of death, and a mint "win" or faded "lose" stamp pill.

### Ability FX
Overlay sized to the board: a dark wash, a full-body avatar card popping in, an ability layer (claws, arrow, rope swing, rings, bubbles) and a white caption card. Phase drops are a white (day) or near-black with lamp text (night) card falling from above.

## Do's and Don'ts

### Do:
- **Do** keep the in-game screen on the reference layout: title bar with timer, 4x4 tile grid, chat under (phone) or beside (desktop) the grid.
- **Do** frame avatars as busts inside tiles and full-body everywhere else (home, wardrobe, FX, results).
- **Do** stage night as a diagonal, tile-by-tile slate fade (0.55s, 90ms per diagonal step) and dawn as a warm gradient sweep in the same order (1.3s, 110ms steps).
- **Do** play deaths on the victim's tile: a horizontal shake, a red bleed fading over 1.6s, and the gravestone rising in.
- **Do** use `cubic-bezier(.16, 1, .3, 1)` for state changes and pops, and keep the reduced-motion rule that collapses every animation and transition to 0.01s with a single iteration.
- **Do** use Phosphor icons in the bold weight only, inline before labels or alone with an aria-label.
- **Do** define every new colour as a custom property with both a day and a night value.

### Don't:
- **Don't** use emoji anywhere in the UI; server copy is stripped of pictographs before display.
- **Don't** copy Wolvesville art, logos, character designs or names; imitate layout and conventions only.
- **Don't** use pink as a team colour or mint/red/orange as decoration.
- **Don't** put shadows on page-level panels or lists; outline them with the 1.5px hairline.
- **Don't** round the board tiles past 4px or square off the controls; pills and windows are the two shapes.
- **Don't** add a vote poll on phones; the tiles' signs and hand counts are the vote display there.
