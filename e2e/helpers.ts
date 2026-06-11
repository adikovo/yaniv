import { Page } from '@playwright/test';

export const BASE = 'http://localhost:5173';
export const SERVER_BASE = 'http://localhost:3000';

// Test-only helper: seeds every player's cumulative score in the given game to
// `score` via the server's /game/seedScores route. Used to force a single Yaniv
// call to end the game (both players at 99 → loser exceeds 100 → gameOver).
export async function seedScores(page: Page, gameID: string, score: number): Promise<void> {
  const res = await page.request.get(`${SERVER_BASE}/game/seedScores?gameID=${gameID}&score=${score}`);
  if (!res.ok()) {
    throw new Error(`seedScores failed: ${res.status()} ${res.statusText()} for gameID=${gameID} score=${score}`);
  }
}

export async function hostGame(page: Page, name: string): Promise<string> {
  await page.goto(BASE);
  await page.getByRole('button', { name: 'Host a Game' }).click();
  await page.getByRole('textbox').fill(name);
  await page.getByRole('button', { name: /Start game/i }).click();
  await page.waitForURL('**/lobby');
  const gameIDText = await page.locator('h4').first().textContent();
  return gameIDText?.replace('Game ID:', '').trim() ?? '';
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
  for (const idx of toDiscard) {
    await cardEls.nth(idx).click();
    await page.waitForTimeout(150);
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

  await page.waitForTimeout(800);
}

// Plays turns until one player's hand sum is ≤ 7 and they can call Yaniv.
// Returns the page and player name of the Yaniv caller.
// Throws if no player reaches sum ≤ 7 within maxAttempts turns.
export async function playUntilYanivReady(
  pages: Page[],
  names: string[],
  maxAttempts = 60,
): Promise<{ yanivCaller: Page; yanivCallerName: string }> {
  let yanivCaller: Page | null = null;
  let yanivCallerName = '';
  let attempts = 0;

  while (!yanivCaller && attempts < maxAttempts) {
    attempts++;
    await pages[0].waitForTimeout(300);

    const idx = await findActiveIndex(pages);
    if (idx === -1) {
      console.log(`  Attempt ${attempts}: active player not found, retrying...`);
      await pages[0].waitForTimeout(500);
      continue;
    }

    const currentPage = pages[idx];
    const currentName = names[idx];
    const sumText = await currentPage.locator('h4', { hasText: 'Sum:' }).textContent();
    const currentSum = parseInt(sumText?.replace('Sum:', '').trim() ?? '999');
    console.log(`  Turn ${attempts}: ${currentName} (sum: ${currentSum})`);

    if (currentSum <= 7) {
      yanivCaller = currentPage;
      yanivCallerName = currentName;
      console.log(`  ✓ ${currentName} can call Yaniv with sum ${currentSum}`);
    } else {
      await discardHighestAndDraw(currentPage);
    }
  }

  if (!yanivCaller) {
    throw new Error(`No player reached sum ≤ 7 after ${maxAttempts} turns`);
  }

  return { yanivCaller, yanivCallerName };
}
