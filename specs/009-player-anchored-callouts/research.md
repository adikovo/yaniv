# Research: Player-Anchored Yaniv/Asaf Call-Outs

## R1: How to anchor a call-out to a player's area

**Decision**: Render the call-out as an absolutely positioned child *inside* the existing player containers (`OpponentArea` and `.local-player-area`), driven by a `callout` prop.

**Rationale**: The containers already exist for every seat (`opponent-top/left/right` grid areas) and in every view (main + spectator, 2–4 players). Anchoring inside them gives correct positioning for free — no coordinate measurement, no portals, no resize handling. A disconnected player's area unmounts, so the call-out degrades gracefully (spec edge case).

**Alternatives considered**:
- *Fixed-position overlay with measured coordinates (getBoundingClientRect + portal)*: handles arbitrary anchoring but adds measurement timing complexity, resize/orientation listeners, and breaks when the target unmounts. Rejected as overkill.
- *Keeping a single overlay component that repositions via CSS classes per seat*: duplicates the seat-layout knowledge already encoded in the grid; falls out of sync if the layout changes. Rejected.

## R2: Who is the Yaniv caller in the `roundEnd` payload

**Decision**: The server passes the Yaniv caller explicitly. `gameLogic.yanivCall` already knows the caller; it returns it, and `socket.js` adds `yanivCaller: { id, name }` to the `roundEnd` payload. The confusingly named `asafCaller` field is dropped (its only consumer, the old centered overlay, is being deleted). The client then needs no derivation: "YANIV!" anchors to `yanivCaller.id`, and "ASAF!" anchors to `winner.id` when `asaf` is true (the winner *is* the counterer in an asaf round).

**Rationale**: User preference for explicitness over a client-side derivation helper. Verified in `server/gameLogic.js` (`yanivCall`): `winner` starts as the caller and is reassigned to the countering player when `asaf` is true — so today the caller is only recoverable client-side via `asaf ? asafCaller.id : winner.id`, which is exactly the kind of hidden semantics worth eliminating at the source.

**Alternatives considered**: Pure client-side derivation from the existing payload (`getCallout` helper) — avoids a server change but spreads the `winner`/`asafCaller` semantics into the client. Rejected per user feedback.

## R3: Sequencing the Asaf call-out

**Decision**: Client-side timer: show "YANIV!" immediately on `roundEnd`; if `asaf`, show "ASAF!" after ~1500ms. Both remain until the existing dismissal (1.5s after `nextRound`) clears `yanivResult`.

**Rationale**: The server already provides the timing envelope (`nextRound` is dealt 3s after `roundEnd`, extended from 2s for this feature). A local timer keeps the sequence purely presentational and identical on all clients within network jitter; no protocol change needed. Total visible time: YANIV ~4.5s, ASAF ~3s.

**Alternatives considered**: Server-emitted second event for the Asaf beat — adds protocol surface for a purely visual concern. Rejected.

## R4: Comic-style text without image assets

**Decision**: CSS-only: bold italic uppercase text, yellow→orange gradient via `background-clip: text`, dark outline via layered `text-shadow`, slight rotation, pop-in `@keyframes` animation (scale 0 → 1.15 → 1).

**Rationale**: User explicitly chose styled CSS text over image assets. Layered `text-shadow` outlines render consistently across mobile browsers (the primary target), unlike `-webkit-text-stroke` alone which clips on some engines when combined with gradient fills.

**Alternatives considered**: SVG text with stroke — crisper outline but heavier markup for a transient element. Rejected.

## R5: Test approach (TDD)

**Decision**: Per the user's TDD workflow — for each behavior change, write the failing test first, then implement to green. Server: Jest tests for `yanivCall` returning the caller (`server/`). Client: Vitest + React Testing Library (`*.test.jsx` colocated, following `opponent-area.test.jsx`) for the CallOut component, the OpponentArea `callout` prop, and the asaf-sequencing hook (fake timers). Finish the feature with the updated Playwright e2e smoke test as final validation.

**Rationale**: Matches the existing test setups (`vitest run` in client, `jest` in server) and the existing e2e harness; the explicit `yanivCaller` payload keeps client logic to simple id comparisons, so the trickiest remaining logic (the asaf timing beat) lives in one small, fake-timer-testable hook.
