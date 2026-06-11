import { test, expect, chromium, Page } from '@playwright/test';

const BASE = 'http://localhost:5173';

async function hostGame(page: Page, name: string): Promise<string> {
  await page.goto(BASE);
  await page.getByRole('button', { name: 'Host a Game' }).click();
  await page.getByRole('textbox').fill(name);
  await page.getByRole('button', { name: /Start game/i }).click();
  await page.waitForURL('**/lobby');
  const gameIDText = await page.locator('h4').first().textContent();
  return gameIDText?.replace('Game ID:', '').trim() ?? '';
}

async function joinGame(page: Page, name: string, gameID: string) {
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
async function findActiveIndex(pages: Page[]): Promise<number> {
  for (let i = 0; i < pages.length; i++) {
    const activeOpponents = await pages[i].locator('.opponent-area.active-turn').count();
    if (activeOpponents === 0) return i;
  }
  return -1;
}

interface CardInfo { idx: number; value: number; suit: string; }

function parseCard(src: string, idx: number): CardInfo {
  const match = src.match(/cards\/(.+)_of_(.+)\.png/);
  if (!match) return { idx, value: 0, suit: '' };
  const valStr = match[1];
  const suit = match[2];
  const value = valStr === 'jack' ? 11 : valStr === 'queen' ? 12 : valStr === 'king' ? 13 : parseInt(valStr) || 1;
  return { idx, value, suit };
}

// Returns the indices of the best multi-card discard (highest total value removed).
// Tries: same-value groups, same-suit sequences of 3+, fallback to single highest.
function bestDiscard(cards: CardInfo[]): number[] {
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
async function discardHighestAndDraw(page: Page) {
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

test('2-player callout: Yaniv callout anchored to correct player area', async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });

  const [aliceCtx, bobCtx] = await Promise.all([
    browser.newContext({ viewport: { width: 900, height: 700 } }),
    browser.newContext({ viewport: { width: 900, height: 700 } }),
  ]);
  const alicePage = await aliceCtx.newPage();
  const bobPage = await bobCtx.newPage();
  const pages = [alicePage, bobPage];
  const names = ['Alice', 'Bob'];

  // ── Step 1: Host ──────────────────────────────────────────────
  console.log('\n▶ Alice hosting game...');
  const gameID = await hostGame(alicePage, 'Alice');
  console.log(`  Game ID: ${gameID}`);
  expect(gameID).toBeTruthy();

  // ── Step 2: Bob joins ─────────────────────────────────────────
  console.log('▶ Bob joining...');
  await joinGame(bobPage, 'Bob', gameID);
  await expect(alicePage.locator('li')).toHaveCount(1, { timeout: 10000 });
  console.log('✓ Both players in lobby');

  // ── Step 3: Start game ────────────────────────────────────────
  console.log('\n▶ Starting game...');
  await alicePage.getByRole('button', { name: /Start Game/i }).click();
  await Promise.all(pages.map(p => p.waitForURL('**/game', { timeout: 15000 })));
  console.log('✓ Both players on /game');

  await pages[0].waitForTimeout(1500);

  // ── Step 4: Verify initial hand sizes ────────────────────────
  console.log('\n▶ Checking initial hand sizes (expect 5 cards each)...');
  for (const [i, page] of pages.entries()) {
    const handCards = page.locator('.hand .card');
    await expect(handCards.first()).toBeVisible({ timeout: 10000 });
    const count = await handCards.count();
    console.log(`  ${names[i]}: ${count} cards in hand`);
    expect(count).toBe(5);
  }

  // ── Step 5: Play turns until someone can call Yaniv (sum ≤ 7) ─
  console.log('\n▶ Playing turns until a player can call Yaniv (sum ≤ 7)...');
  let yanivCaller: Page | null = null;
  let yanivCallerName = '';
  let attempts = 0;
  const maxAttempts = 40;

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

  const otherPage = yanivCaller === alicePage ? bobPage : alicePage;
  const otherName = yanivCallerName === 'Alice' ? 'Bob' : 'Alice';

  // ── Step 6: Call Yaniv ────────────────────────────────────────
  console.log(`\n▶ ${yanivCallerName} calls Yaniv!`);
  await yanivCaller.getByRole('button', { name: 'YANIV' }).click();

  // Assertion 1: caller sees callout anchored inside their own local-player-area
  await expect(yanivCaller.locator('.local-player-area .call-out-yaniv')).toBeVisible({ timeout: 5000 });
  console.log(`  ✓ ${yanivCallerName} (caller) sees .local-player-area .call-out-yaniv`);

  // Assertion 2: other player sees callout anchored inside the caller's opponent-area
  await expect(otherPage.locator('.opponent-area .call-out-yaniv')).toBeVisible({ timeout: 5000 });
  console.log(`  ✓ ${otherName} sees .opponent-area .call-out-yaniv`);

  // Assertion 3: callout does NOT appear outside its anchor — exactly 1 callout per page
  const callerCalloutCount = await yanivCaller.locator('.call-out-yaniv').count();
  expect(callerCalloutCount).toBe(1);
  console.log(`  ✓ ${yanivCallerName}: exactly 1 .call-out-yaniv in DOM (count: ${callerCalloutCount})`);

  const otherCalloutCount = await otherPage.locator('.call-out-yaniv').count();
  expect(otherCalloutCount).toBe(1);
  console.log(`  ✓ ${otherName}: exactly 1 .call-out-yaniv in DOM (count: ${otherCalloutCount})`);

  console.log(`✓ Yaniv callout correctly anchored on both pages`);

  // ── Step 7: Wait for next round and verify callout is gone ────
  console.log('\n▶ Waiting for next round (~4500ms)...');
  await pages[0].waitForTimeout(4500);

  await expect(yanivCaller.locator('.call-out-yaniv')).not.toBeVisible({ timeout: 6000 });
  console.log(`  ✓ ${yanivCallerName}: .call-out-yaniv gone`);

  await expect(otherPage.locator('.call-out-yaniv')).not.toBeVisible({ timeout: 6000 });
  console.log(`  ✓ ${otherName}: .call-out-yaniv gone`);

  console.log('✓ Yaniv callout dismissed on both pages');

  // ── Step 8: Verify both players have 5 cards in new round ─────
  console.log('\n▶ Verifying both players have 5 cards in new round...');
  for (const [i, page] of pages.entries()) {
    const handCards = page.locator('.hand .card');
    await expect(handCards.first()).toBeVisible({ timeout: 8000 });
    const count = await handCards.count();
    console.log(`  ${names[i]}: ${count} cards in hand`);
    expect(count).toBe(5);
  }
  console.log('✓ Both players have 5 cards in new round');

  console.log('\n✅ All callout checks passed! Keeping windows open 5s for visual inspection...');
  await pages[0].waitForTimeout(5000);

  await browser.close();
});
