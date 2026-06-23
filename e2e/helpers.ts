import { Page, expect } from '@playwright/test';

export const BASE = 'http://localhost:5173';
export const SERVER_BASE = 'http://localhost:3000';

// Test-only helper: seeds every player's cumulative score in the given game to
// `score` via the server's /test/seedScores route. Used to force a single Yaniv
// call to end the game (both players at 99 → loser exceeds 100 → gameOver).
export async function seedScores(page: Page, gameID: string, score: number): Promise<void> {
  const res = await page.request.get(`${SERVER_BASE}/test/seedScores?gameID=${gameID}&score=${score}`);
  if (!res.ok()) {
    throw new Error(`seedScores failed: ${res.status()} ${res.statusText()} for gameID=${gameID} score=${score}`);
  }
}

// Test-only helper: sets player `playerId`'s hand to a single card of value
// `sum` (default 1) via /test/seedHand, so a Yaniv-ready be forced
export async function seedHand(page: Page, gameID: string, playerId: number, sum = 1): Promise<void> {
  const res = await page.request.get(`${SERVER_BASE}/test/seedHand?gameID=${gameID}&playerId=${playerId}&sum=${sum}`);
  if (!res.ok()) {
    throw new Error(`seedHand failed: ${res.status()} ${res.statusText()} for gameID=${gameID} playerId=${playerId} sum=${sum}`);
  }
}

export async function hostGame(page: Page, name: string): Promise<string> {
  await page.goto(BASE);
  await page.getByRole('button', { name: 'Host a Game' }).click();
  await page.getByRole('textbox').fill(name);
  await page.getByRole('button', { name: /Start game/i }).click();
  await page.waitForURL('**/lobby');
  const gameIDText = await page.locator('.gameid-value').first().textContent();
  return gameIDText?.trim() ?? '';
}

export async function joinGame(page: Page, name: string, gameID: string) {
  await page.goto(BASE);
  await page.getByRole('button', { name: 'Join a Game' }).click();
  const inputs = page.getByRole('textbox');
  await inputs.nth(0).fill(name);
  await inputs.nth(1).fill(gameID);
  await page.getByRole('button', { name: /Join Game/i }).click();
  await page.waitForURL('**/lobby');
}

// Returns the index of the page whose player currently has the turn.
// Signal: the active player's page has 0 opponent areas with .active-turn
// (no opponent is highlighted because it's the local player's own turn).
export async function findActiveIndex(pages: Page[]): Promise<number> {
  for (let i = 0; i < pages.length; i++) {
    const activeOpponents = await pages[i].locator('.opponent-area.active-turn').count();
    if (activeOpponents === 0) return i;
  }
  return -1;
}

// Waits until the turn state has settled — i.e. on exactly one page no opponent
// area is highlighted active (that page's local player holds the turn). Returns
// that page's index. Polls the DOM (web-first) instead of relying on a fixed
// delay, so it is robust to the socket round-trip latency that varies between
// local (slowMo) and CI (fast) runs. Throws if the turn never settles in time.
export async function waitForActiveIndex(pages: Page[], timeout = 15000): Promise<number> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const counts = await Promise.all(
      pages.map(p => p.locator('.opponent-area.active-turn').count())
    );
    const activeIndices = counts
      .map((c, i) => (c === 0 ? i : -1))
      .filter(i => i !== -1);
    // Settled iff exactly one page reports it is the local player's turn.
    if (activeIndices.length === 1) return activeIndices[0];
    await pages[0].waitForTimeout(100);
  }
  throw new Error(`Turn state did not settle to a single active player within ${timeout}ms`);
}

export interface CardInfo { idx: number; value: number; suit: string; }

export function parseCard(src: string, idx: number): CardInfo {
  const match = src.match(/cards\/(.+)_of_(.+)\.png/);
  if (!match) return { idx, value: 0, suit: '' };
  const valStr = match[1];
  const suit = match[2];
  const value = valStr === 'jack' ? 11 : valStr === 'queen' ? 12 : valStr === 'king' ? 13 : parseInt(valStr) || 1;
  return { idx, value, suit };
}

// Returns the indices of the best multi-card discard (highest total value removed).
// Tries: same-value groups, same-suit sequences of 3+, fallback to single highest.
export function bestDiscard(cards: CardInfo[]): number[] {
  let best: number[] = [];
  let bestSum = 0;

  // Same-value groups
  const byValue = new Map<number, CardInfo[]>();
  for (const c of cards) {
    if (!byValue.has(c.value)) byValue.set(c.value, []);
    byValue.get(c.value)!.push(c);
  }
  for (const group of byValue.values()) {
    if (group.length >= 2) {
      const s = group.reduce((a, c) => a + c.value, 0);
      if (s > bestSum) { bestSum = s; best = group.map(c => c.idx); }
    }
  }

  // Same-suit sequences of 3+
  const bySuit = new Map<string, CardInfo[]>();
  for (const c of cards) {
    if (!bySuit.has(c.suit)) bySuit.set(c.suit, []);
    bySuit.get(c.suit)!.push(c);
  }
  for (const group of bySuit.values()) {
    const sorted = [...group].sort((a, b) => a.value - b.value);
    // Find longest consecutive run
    let run = [sorted[0]];
    let bestRun = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].value === sorted[i - 1].value + 1) {
        run.push(sorted[i]);
      } else {
        run = [sorted[i]];
      }
      if (run.length > bestRun.length) bestRun = [...run];
    }
    if (bestRun.length >= 3) {
      const s = bestRun.reduce((a, c) => a + c.value, 0);
      if (s > bestSum) { bestSum = s; best = bestRun.map(c => c.idx); }
    }
  }

  // Fallback: single highest card
  if (best.length === 0) {
    const highest = cards.reduce((a, c) => c.value > a.value ? c : a);
    best = [highest.idx];
  }

  return best;
}

// Selects the best discard combo, then draws from the top-card pile if any
// exposed card is cheaper than the average kept card; otherwise draws from deck.
export async function discardHighestAndDraw(page: Page) {
  const cardEls = page.locator('.hand .card');
  const count = await cardEls.count();
  const cardInfos: CardInfo[] = [];
  for (let i = 0; i < count; i++) {
    const src = (await cardEls.nth(i).getAttribute('src')) ?? '';
    cardInfos.push(parseCard(src, i));
  }
  const toDiscard = bestDiscard(cardInfos);

  // Click the cards to discard first (before reading top-card pile, since
  // clicking a card changes selection state but doesn't mutate the pile).
  // Selection toggles the .selected class synchronously (client-side, no
  // socket), so wait on that class rather than a fixed 150ms delay.
  for (let n = 0; n < toDiscard.length; n++) {
    await cardEls.nth(toDiscard[n]).click();
    await expect(page.locator('.hand .card.selected')).toHaveCount(n + 1, { timeout: 5000 });
  }

  // Compute average value of cards we are keeping.
  const discardSet = new Set(toDiscard);
  const kept = cardInfos.filter(c => !discardSet.has(c.idx));
  const avgKept = kept.length > 0 ? kept.reduce((s, c) => s + c.value, 0) / kept.length : 99;

  // Read the top-card pile (first and last are drawable).
  const topCardEls = page.locator('.top_card_pile .card');
  const topCount = await topCardEls.count();
  let drewFromPile = false;

  if (topCount > 0) {
    // Candidates: index 0 and index topCount-1 (may be the same card when count === 1)
    const candidateIndices = topCount === 1 ? [0] : [0, topCount - 1];
    for (const ci of candidateIndices) {
      const src = (await topCardEls.nth(ci).getAttribute('src')) ?? '';
      const topCard = parseCard(src, ci);
      if (topCard.value < avgKept) {
        await topCardEls.nth(ci).click();
        drewFromPile = true;
        break;
      }
    }
  }

  if (!drewFromPile) {
    await page.getByRole('button', { name: 'DECK' }).click();
  }

  // Discarding `toDiscard.length` cards and drawing exactly one leaves the hand
  // at `count - toDiscard.length + 1` (it only stays at 5 when a single card is
  // discarded; a pair/run shrinks it). Wait for the discard+draw socket
  // round-trip to settle the hand at that size, instead of guessing with a
  // fixed delay — this is the signal that the turn fully processed.
  const expectedAfter = count - toDiscard.length + 1;
  await expect(page.locator('.hand .card')).toHaveCount(expectedAfter, { timeout: 10000 });
  return expectedAfter;
}

// Deterministically forces the current-turn player into a Yaniv-ready hand by
// seeding their hand server-side (sum=1 by default), instead of playing random
// turns until someone happens to reach sum ≤ 7. Waits for the turn to settle,
// seeds that player, then waits until their YANIV button is enabled.
// Returns the page and player name of the (now Yaniv-ready) caller.
export async function forceYanivReady(
  pages: Page[],
  names: string[],
  gameID: string,
  sum = 1,
): Promise<{ yanivCaller: Page; yanivCallerName: string }> {
  const idx = await waitForActiveIndex(pages);
  const yanivCaller = pages[idx];
  const yanivCallerName = names[idx];
  console.log(`  Seeding ${yanivCallerName} (player ${idx}) to sum ${sum} for a deterministic Yaniv...`);

  // playerId equals the page index: host is player 0, joiners are added in order.
  await seedHand(yanivCaller, gameID, idx, sum);

  // Wait until the seeded hand has propagated to the client and the YANIV button
  // (disabled when sum > 7 or not your turn) is clickable — web-first, no fixed delay.
  await expect(yanivCaller.getByRole('button', { name: 'YANIV' })).toBeEnabled({ timeout: 10000 });
  console.log(`  ✓ ${yanivCallerName} is Yaniv-ready (sum ${sum})`);

  return { yanivCaller, yanivCallerName };
}
