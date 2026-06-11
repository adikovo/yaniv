import { test, expect, chromium, Page } from '@playwright/test';
import {
  hostGame,
  joinGame,
  findActiveIndex,
  discardHighestAndDraw,
} from './helpers';

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
