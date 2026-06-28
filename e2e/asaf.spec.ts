import { test, expect, chromium } from '@playwright/test';
import { hostGame, joinGame, waitForActiveIndex, seedHand } from './helpers';

// Asaf: the Yaniv caller is *beaten* — another player has an equal-or-lower
// hand — so the caller is penalized (+30) and the lower hand wins the round.
// Every other e2e assumes the caller wins, so this is the only coverage of the
// 'asaf' callout variant + penalty badge + the post-1.5s ASAF reveal animation.
//
// Setup  : 2 players. Force the current-turn caller to sum 7, the opponent to
//          sum 3 (3 ≤ 7 → asaf, opponent wins).
// Assert : caller shows YANIV!, opponent shows ASAF! with a +30 penalty badge,
//          each anchored to the right player area on both pages.
test('2-player: caller beaten → ASAF callout with +30 penalty on the lower hand', async () => {
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

  try {
    // ── Step 1: Host + join + start ─────────────────────────────
    console.log('\n▶ Alice hosting game...');
    const gameID = await hostGame(alicePage, 'Alice');
    expect(gameID).toBeTruthy();

    console.log('▶ Bob joining...');
    await joinGame(bobPage, 'Bob', gameID);
    await expect(alicePage.locator('li')).toHaveCount(2, { timeout: 10000 });

    console.log('\n▶ Starting game...');
    await alicePage.getByRole('button', { name: /Start Game/i }).click();
    await Promise.all(pages.map(p => p.waitForURL('**/game', { timeout: 15000 })));
    console.log('✓ Both players on /game');

    // ── Step 2: Seed an Asaf setup ──────────────────────────────
    // The current-turn player must be the caller (only they can call Yaniv).
    const callerIdx = await waitForActiveIndex(pages);
    const otherIdx = callerIdx === 0 ? 1 : 0;
    const callerPage = pages[callerIdx];
    const otherPage = pages[otherIdx];
    const callerName = names[callerIdx];
    const otherName = names[otherIdx];
    console.log(`\n▶ Seeding ${callerName}=7 (caller) and ${otherName}=3 (beats caller → asaf)...`);
    await seedHand(callerPage, gameID, callerIdx, 7);
    await seedHand(otherPage, gameID, otherIdx, 3);

    // YANIV enables once the caller's seeded sum (7 ≤ 7) reaches the client.
    await expect(callerPage.getByRole('button', { name: 'YANIV' })).toBeEnabled({ timeout: 10000 });

    // ── Step 3: Call Yaniv → Asaf ───────────────────────────────
    console.log(`\n▶ ${callerName} calls Yaniv (and gets Asaf'd)...`);
    await callerPage.getByRole('button', { name: 'YANIV' }).click();

    // Caller's own YANIV callout shows immediately, anchored to their area.
    await expect(callerPage.locator('.local-player-area .call-out-yaniv')).toBeVisible({ timeout: 5000 });
    console.log(`  ✓ ${callerName} sees their own YANIV! callout`);

    // The ASAF! callout for the winning lower hand appears after the ~1.5s
    // reveal delay. Assert it on both pages, anchored to the right player:
    //  - on the caller's page, the opponent (winner) shows ASAF in their opponent area
    //  - on the winner's own page, ASAF shows in their local-player-area
    await expect(callerPage.locator('.opponent-area .call-out-asaf')).toBeVisible({ timeout: 8000 });
    console.log(`  ✓ ${callerName} sees ${otherName}'s ASAF! callout in the opponent area`);

    await expect(otherPage.locator('.local-player-area .call-out-asaf')).toBeVisible({ timeout: 8000 });
    console.log(`  ✓ ${otherName} sees their own ASAF! callout`);

    // The +30 penalty badge accompanies the ASAF callout.
    await expect(otherPage.locator('.call-out-asaf .call-out-penalty')).toHaveText('+30', { timeout: 8000 });
    console.log(`  ✓ ASAF! callout shows the +30 penalty badge`);

    console.log('\n✅ Asaf checks passed!');
  } finally {
    await browser.close();
  }
});
