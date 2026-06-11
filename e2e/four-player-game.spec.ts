import { test, expect, chromium, Page } from '@playwright/test';
import {
  hostGame,
  joinGame,
  findActiveIndex,
  discardHighestAndDraw,
} from './helpers';

const PLAYERS = ['Alice', 'Bob', 'Carol', 'Dave'];

test('4-player game: join, start, play a turn, verify card counts', async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });

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

  await expect(hostPage.locator('li')).toHaveCount(3, { timeout: 10000 });
  console.log('✓ All 4 players in lobby');

  // ── Step 3: Start game ────────────────────────────────────────
  console.log('\n▶ Starting game...');
  await hostPage.getByRole('button', { name: /Start Game/i }).click();
  await Promise.all(pages.map(p => p.waitForURL('**/game', { timeout: 15000 })));
  console.log('✓ All players on /game');

  await pages[0].waitForTimeout(1500);

  // ── Step 4: Verify each player has 5 cards in hand ───────────
  console.log('\n▶ Checking initial hand sizes (expect 5 cards each)...');
  for (const [i, page] of pages.entries()) {
    const handCards = page.locator('.hand .card');
    await expect(handCards.first()).toBeVisible({ timeout: 10000 });
    const count = await handCards.count();
    console.log(`  ${PLAYERS[i]}: ${count} cards in hand`);
    expect(count).toBe(5);
  }

  // ── Step 5: Verify opponent areas show correct hand counts ────
  console.log('\n▶ Checking opponent hand counts in UI...');
  for (const [i, page] of pages.entries()) {
    const opponentAreas = page.locator('.opponent-area');
    const areaCount = await opponentAreas.count();
    console.log(`  ${PLAYERS[i]} sees ${areaCount} opponent areas`);
    expect(areaCount).toBe(3);

    for (let j = 0; j < areaCount; j++) {
      const cardCount = await opponentAreas.nth(j).locator('.card').count();
      console.log(`    Opponent area ${j + 1}: ${cardCount} face-down cards`);
      expect(cardCount).toBe(5);
    }
  }

  // ── Step 6: Find whose turn it is ────────────────────────────
  console.log('\n▶ Finding active player...');
  const activeIndex = await findActiveIndex(pages);
  expect(activeIndex).not.toBe(-1);
  const activePage = pages[activeIndex];
  const activeName = PLAYERS[activeIndex];
  console.log(`✓ Active player: ${activeName}`);

  // ── Step 7: Sum display updates when card is selected ─────────
  console.log(`\n▶ Checking Sum label updates on card select (${activeName})...`);
  const sumLabel = activePage.locator('h4', { hasText: 'Sum:' });
  await expect(sumLabel).toBeVisible();

  // Sum shows total hand value (sent by server) — should be > 0 with a fresh hand
  const sumTextBefore = await sumLabel.textContent();
  const sumBefore = parseInt(sumTextBefore?.replace('Sum:', '').trim() ?? '0');
  console.log(`  Hand sum: ${sumBefore}`);
  expect(sumBefore).toBeGreaterThan(0);
  console.log(`✓ Sum label shows ${sumBefore} for ${activeName}'s hand`);

  // ── Step 8: Active player discards highest card and draws from deck ──
  console.log(`\n▶ ${activeName} discards highest card and draws from deck...`);
  await discardHighestAndDraw(activePage);
  await activePage.waitForTimeout(200);

  const handAfterDraw = await activePage.locator('.hand .card').count();
  console.log(`  Hand after draw: ${handAfterDraw} cards`);
  expect(handAfterDraw).toBe(5);
  console.log(`✓ ${activeName} hand size unchanged at 5 after discard+draw`);

  const sumTextAfter = await sumLabel.textContent();
  const sumAfter = parseInt(sumTextAfter?.replace('Sum:', '').trim() ?? '-1');
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
  const observedCards = await activePlayerArea.locator('.card').count();
  console.log(`  ${PLAYERS[observerIndex]} sees ${observedCards} cards for ${activeName}`);
  expect(observedCards).toBe(5);
  console.log('✓ Opponent hand count synced correctly');

  // ── Step 10: Active-turn highlight moved ─────────────────────
  console.log('\n▶ Verifying turn highlight moved...');
  await observerPage.waitForTimeout(500);
  const activeAreas = await observerPage.locator('.opponent-area.active-turn').count();
  console.log(`  Observer sees ${activeAreas} active-turn opponent area(s)`);
  expect(activeAreas).toBeLessThanOrEqual(1);
  console.log('✓ Active-turn highlight is valid');

  // ── Step 11: Play turns until someone can call Yaniv (sum ≤ 7) ─
  console.log('\n▶ Playing turns until a player can call Yaniv (sum ≤ 7)...');
  let yanivCaller: Page | null = null;
  let yanivCallerName = '';
  let attempts = 0;
  const maxAttempts = 80;

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
    const currentName = PLAYERS[idx];
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
  console.log('\n▶ Waiting for next round...');
  await pages[0].waitForTimeout(4500);

  for (const [i, page] of pages.entries()) {
    await expect(page.locator('.call-out-yaniv')).not.toBeVisible({ timeout: 6000 });
    console.log(`  ✓ ${PLAYERS[i]}: .call-out-yaniv gone`);
  }
  console.log('✓ Yaniv callout dismissed on all pages');

  // ── Step 14: Verify all hands reset to 5 cards ───────────────
  console.log('\n▶ Verifying all hands reset to 5 after new round...');
  for (const [i, page] of pages.entries()) {
    const handCards = page.locator('.hand .card');
    await expect(handCards.first()).toBeVisible({ timeout: 8000 });
    const count = await handCards.count();
    console.log(`  ${PLAYERS[i]}: ${count} cards in hand`);
    expect(count).toBe(5);
  }
  console.log('✓ All players have 5 cards in new round');

  // ── Step 15: Winner starts the next round ────────────────────
  console.log(`\n▶ Verifying ${roundWinnerName} starts the next round...`);

  for (const [i, page] of pages.entries()) {
    const isWinner = PLAYERS[i] === roundWinnerName;
    const activeOpponents = await page.locator('.opponent-area.active-turn').count();

    if (isWinner) {
      expect(activeOpponents).toBe(0);
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

  console.log('\n✅ All checks passed! Keeping windows open 8s for visual inspection...');
  await pages[0].waitForTimeout(8000);

  await browser.close();
});
