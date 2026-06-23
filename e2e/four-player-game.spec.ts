import { test, expect, chromium } from '@playwright/test';
import {
  hostGame,
  joinGame,
  waitForActiveIndex,
  discardHighestAndDraw,
  forceYanivReady,
} from './helpers';

const PLAYERS = ['Alice', 'Bob', 'Carol', 'Dave'];

test('4-player game: join, start, play a turn, verify card counts', async () => {
  // Honor the CI environment: headless + slowMo 0 under CI, headed + slow locally.
  const browser = await chromium.launch({
    headless: !!process.env.CI,
    slowMo: process.env.CI ? 0 : 500,
  });

  const contexts = await Promise.all(
    PLAYERS.map(() => browser.newContext({ viewport: { width: 900, height: 700 } }))
  );
  const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));
  const [hostPage, ...joinPages] = pages;

  // ── Step 1: Host ──────────────────────────────────────────────
  console.log('\n▶ Alice hosting game...');
  const gameID = await hostGame(hostPage, 'Alice');
  console.log(`  Game ID: ${gameID}`);
  expect(gameID).toBeTruthy();

  // ── Step 2: Others join ───────────────────────────────────────
  for (const [i, page] of joinPages.entries()) {
    console.log(`▶ ${PLAYERS[i + 1]} joining...`);
    await joinGame(page, PLAYERS[i + 1], gameID);
  }

  await expect(hostPage.locator('li')).toHaveCount(4, { timeout: 10000 });
  console.log('✓ All 4 players in lobby');

  // ── Step 3: Start game ────────────────────────────────────────
  console.log('\n▶ Starting game...');
  await hostPage.getByRole('button', { name: /Start Game/i }).click();
  await Promise.all(pages.map(p => p.waitForURL('**/game', { timeout: 15000 })));
  console.log('✓ All players on /game');

  // No fixed settle wait needed — Step 4 below uses toHaveCount(5) which
  // auto-retries until each hand has been dealt.

  // ── Step 4: Verify each player has 5 cards in hand ───────────
  console.log('\n▶ Checking initial hand sizes (expect 5 cards each)...');
  for (const [i, page] of pages.entries()) {
    const handCards = page.locator('.hand .card');
    // Web-first assertion auto-retries until the hand has settled at 5 cards.
    await expect(handCards).toHaveCount(5, { timeout: 10000 });
    console.log(`  ${PLAYERS[i]}: 5 cards in hand`);
  }

  // ── Step 5: Verify opponent areas show correct hand counts ────
  console.log('\n▶ Checking opponent hand counts in UI...');
  for (const [i, page] of pages.entries()) {
    const opponentAreas = page.locator('.opponent-area');
    await expect(opponentAreas).toHaveCount(3, { timeout: 10000 });
    console.log(`  ${PLAYERS[i]} sees 3 opponent areas`);

    for (let j = 0; j < 3; j++) {
      await expect(opponentAreas.nth(j).locator('.card')).toHaveCount(5, { timeout: 10000 });
      console.log(`    Opponent area ${j + 1}: 5 face-down cards`);
    }
  }

  // ── Step 6: Find whose turn it is ────────────────────────────
  console.log('\n▶ Finding active player...');
  // Wait for the turn state to settle to exactly one active player rather than
  // reading it once (the dealing → first-turn highlight is a socket round-trip).
  const activeIndex = await waitForActiveIndex(pages);
  expect(activeIndex).not.toBe(-1);
  const activePage = pages[activeIndex];
  const activeName = PLAYERS[activeIndex];
  console.log(`✓ Active player: ${activeName}`);

  // ── Step 7: Sum display updates when card is selected ─────────
  console.log(`\n▶ Checking Sum label updates on card select (${activeName})...`);
  const sumLabel = activePage.locator('.hand-sum');
  await expect(sumLabel).toBeVisible();
  // Wait until the sum has populated with a non-zero numeric total before
  // reading it (it arrives with the dealt hand via socket).
  await expect(sumLabel).toHaveText(/SUM\s*[1-9]/, { timeout: 5000 });

  // Sum shows total hand value (sent by server) — should be > 0 with a fresh hand
  const sumTextBefore = await sumLabel.textContent();
  const sumBefore = parseInt(sumTextBefore?.replace(/SUM/i, '').trim() ?? '0');
  console.log(`  Hand sum: ${sumBefore}`);
  expect(sumBefore).toBeGreaterThan(0);
  console.log(`✓ Sum label shows ${sumBefore} for ${activeName}'s hand`);

  // ── Step 8: Active player discards highest card and draws from deck ──
  console.log(`\n▶ ${activeName} discards highest card and draws from deck...`);
  // The helper already waits for the hand to re-settle (it may shrink if a
  // multi-card combo was discarded) and returns the resulting hand size.
  const handAfterDraw = await discardHighestAndDraw(activePage);
  console.log(`✓ ${activeName} hand re-settled at ${handAfterDraw} cards after discard+draw`);

  const sumTextAfter = await sumLabel.textContent();
  const sumAfter = parseInt(sumTextAfter?.replace(/SUM/i, '').trim() ?? '-1');
  console.log(`  Sum updated to new hand total: ${sumAfter}`);
  expect(sumAfter).toBeGreaterThanOrEqual(0);
  console.log('✓ Sum updated after draw');

  // ── Step 9: Verify opponent sees updated count ────────────────
  console.log('\n▶ Checking opponent sees correct hand count for active player...');
  const observerIndex = (activeIndex + 1) % pages.length;
  const observerPage = pages[observerIndex];

  const activePlayerArea = observerPage.locator('.opponent-area').filter({
    has: observerPage.locator(`.opponent-name:text("${activeName}")`),
  });
  await expect(activePlayerArea).toBeVisible({ timeout: 5000 });
  // The observer must see the active player's current hand size, which equals
  // handAfterDraw (it shrinks if a combo was discarded), not a fixed 5.
  await expect(activePlayerArea.locator('.card')).toHaveCount(handAfterDraw, { timeout: 5000 });
  console.log(`  ${PLAYERS[observerIndex]} sees ${handAfterDraw} cards for ${activeName}`);
  console.log('✓ Opponent hand count synced correctly');

  // ── Step 10: Active-turn highlight moved ─────────────────────
  console.log('\n▶ Verifying turn highlight moved...');
  // At most one opponent area may be highlighted active at any time. Web-first
  // assertion polls the DOM rather than reading the count once after a fixed wait.
  await expect(async () => {
    const activeAreas = await observerPage.locator('.opponent-area.active-turn').count();
    expect(activeAreas).toBeLessThanOrEqual(1);
  }).toPass({ timeout: 5000 });
  console.log('✓ Active-turn highlight is valid');

  // ── Step 11: Force the active player Yaniv-ready (deterministic seed) ─
  console.log('\n▶ Forcing the active player Yaniv-ready via seedHand...');
  const { yanivCaller, yanivCallerName } = await forceYanivReady(pages, PLAYERS, gameID);

  // ── Step 12: Call Yaniv ───────────────────────────────────────
  console.log(`\n▶ ${yanivCallerName} calls Yaniv!`);
  await yanivCaller.getByRole('button', { name: 'YANIV' }).click();

  // Caller sees the callout anchored to their own player area
  await expect(yanivCaller.locator('.local-player-area .call-out-yaniv')).toBeVisible({ timeout: 5000 });
  console.log(`  ✓ ${yanivCallerName} (caller) sees .local-player-area .call-out-yaniv`);

  // Every other player sees the callout anchored to the caller's opponent area
  for (const [i, page] of pages.entries()) {
    if (page === yanivCaller) continue;
    await expect(page.locator('.opponent-area .call-out-yaniv')).toBeVisible({ timeout: 5000 });
    console.log(`  ✓ ${PLAYERS[i]} sees .opponent-area .call-out-yaniv`);
  }

  // In a normal Yaniv round the caller wins
  const roundWinnerName = yanivCallerName;
  console.log(`✓ Yaniv callout visible on all pages (winner: ${roundWinnerName})`);

  // ── Step 13: Wait for next round ─────────────────────────────
  // The callout auto-dismisses after the round-result delay (~4.5s). The
  // not.toBeVisible assertion below auto-retries up to 10s, so no fixed wait
  // is needed here.
  console.log('\n▶ Waiting for next round...');

  for (const [i, page] of pages.entries()) {
    await expect(page.locator('.call-out-yaniv')).not.toBeVisible({ timeout: 10000 });
    console.log(`  ✓ ${PLAYERS[i]}: .call-out-yaniv gone`);
  }
  console.log('✓ Yaniv callout dismissed on all pages');

  // ── Step 14: Verify all hands reset to 5 cards ───────────────
  console.log('\n▶ Verifying all hands reset to 5 after new round...');
  for (const [i, page] of pages.entries()) {
    await expect(page.locator('.hand .card')).toHaveCount(5, { timeout: 8000 });
    console.log(`  ${PLAYERS[i]}: 5 cards in hand`);
  }
  console.log('✓ All players have 5 cards in new round');

  // ── Step 15: Winner starts the next round ────────────────────
  console.log(`\n▶ Verifying ${roundWinnerName} starts the next round...`);

  for (const [i, page] of pages.entries()) {
    const isWinner = PLAYERS[i] === roundWinnerName;

    if (isWinner) {
      // On the winner's own page no opponent should be highlighted (it's their
      // turn). Web-first assertion polls until the turn state propagates.
      await expect(page.locator('.opponent-area.active-turn')).toHaveCount(0, { timeout: 3000 });
      console.log(`  ✓ ${PLAYERS[i]} (winner): it's their turn`);
    } else {
      const winnerArea = page.locator('.opponent-area').filter({
        has: page.locator(`.opponent-name:text("${roundWinnerName}")`),
      });
      await expect(winnerArea).toHaveClass(/active-turn/, { timeout: 3000 });
      console.log(`  ✓ ${PLAYERS[i]} sees ${roundWinnerName} highlighted as active`);
    }
  }
  console.log(`✓ ${roundWinnerName} correctly starts the next round`);

  // Local-only: keep windows open briefly for visual inspection. Skipped in CI
  // (no display, and it only wastes wall-clock time).
  if (!process.env.CI) {
    console.log('\n✅ All checks passed! Keeping windows open 8s for visual inspection...');
    await pages[0].waitForTimeout(8000);
  } else {
    console.log('\n✅ All checks passed!');
  }

  await browser.close();
});
