import { test, expect, chromium } from '@playwright/test';
import {
  hostGame,
  joinGame,
  forceYanivReady,
} from './helpers';

test('2-player callout: Yaniv callout anchored to correct player area', async () => {
  // Honor the CI environment: headless + slowMo 0 under CI, headed + slow locally.
  const browser = await chromium.launch({
    headless: !!process.env.CI,
    slowMo: process.env.CI ? 0 : 300,
  });

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

  // No fixed settle wait needed — Step 4 below uses toHaveCount(5) which
  // auto-retries until each hand has been dealt.

  // ── Step 4: Verify initial hand sizes ────────────────────────
  console.log('\n▶ Checking initial hand sizes (expect 5 cards each)...');
  for (const [i, page] of pages.entries()) {
    await expect(page.locator('.hand .card')).toHaveCount(5, { timeout: 10000 });
    console.log(`  ${names[i]}: 5 cards in hand`);
  }

  // ── Step 5: Force the active player Yaniv-ready (deterministic seed) ─
  console.log('\n▶ Forcing the active player Yaniv-ready via seedHand...');
  const { yanivCaller, yanivCallerName } = await forceYanivReady(pages, names, gameID);

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
  await expect(yanivCaller.locator('.call-out-yaniv')).toHaveCount(1);
  console.log(`  ✓ ${yanivCallerName}: exactly 1 .call-out-yaniv in DOM`);

  await expect(otherPage.locator('.call-out-yaniv')).toHaveCount(1);
  console.log(`  ✓ ${otherName}: exactly 1 .call-out-yaniv in DOM`);

  console.log(`✓ Yaniv callout correctly anchored on both pages`);

  // ── Step 7: Wait for next round and verify callout is gone ────
  // The callout auto-dismisses after the round-result delay (~4.5s). The
  // not.toBeVisible assertions below auto-retry up to 10s, so no fixed wait.
  console.log('\n▶ Waiting for next round...');

  await expect(yanivCaller.locator('.call-out-yaniv')).not.toBeVisible({ timeout: 10000 });
  console.log(`  ✓ ${yanivCallerName}: .call-out-yaniv gone`);

  await expect(otherPage.locator('.call-out-yaniv')).not.toBeVisible({ timeout: 10000 });
  console.log(`  ✓ ${otherName}: .call-out-yaniv gone`);

  console.log('✓ Yaniv callout dismissed on both pages');

  // ── Step 8: Verify both players have 5 cards in new round ─────
  console.log('\n▶ Verifying both players have 5 cards in new round...');
  for (const [i, page] of pages.entries()) {
    await expect(page.locator('.hand .card')).toHaveCount(5, { timeout: 8000 });
    console.log(`  ${names[i]}: 5 cards in hand`);
  }
  console.log('✓ Both players have 5 cards in new round');

  // Local-only: keep windows open briefly for visual inspection. Skipped in CI.
  if (!process.env.CI) {
    console.log('\n✅ All callout checks passed! Keeping windows open 5s for visual inspection...');
    await pages[0].waitForTimeout(5000);
  } else {
    console.log('\n✅ All callout checks passed!');
  }

  await browser.close();
});
