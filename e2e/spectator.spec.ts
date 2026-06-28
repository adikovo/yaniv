import { test, expect, chromium } from '@playwright/test';
import { hostGame, joinGame, waitForActiveIndex, seedHand, seedScores } from './helpers';

// Spectator flow: when a player is eliminated but the game continues (≥2 players
// remain), that player is offered a "Watch" prompt and, on accepting, switches
// to a read-only spectator view. This only happens with 3+ players (in a
// 2-player game an elimination ends the game), and none of it is reachable from
// a server unit test, so it's pure untested integration.
//
// Setup  : 3 players, all at score 95. Force a Yaniv where the caller wins
//          (sum 1), one opponent survives (sum 2 → 97), and one is eliminated
//          (sum 10 → 105 > 100). No asaf: caller has the strictly lowest hand.
// Assert : the eliminated player gets the spectator prompt, clicks Watch, and
//          lands in the spectator view (board + Home (Leave game), no hand, no YANIV).
test('3-player: eliminated player can choose to watch as a spectator', async () => {
  test.setTimeout(60000);

  const browser = await chromium.launch({
    headless: !!process.env.CI,
    slowMo: process.env.CI ? 0 : 300,
  });

  const ctxs = await Promise.all(
    [0, 1, 2].map(() => browser.newContext({ viewport: { width: 900, height: 700 } }))
  );
  const pages = await Promise.all(ctxs.map(c => c.newPage()));
  const names = ['Alice', 'Bob', 'Carol'];

  try {
    console.log('\n▶ Alice hosting; Bob + Carol joining...');
    const gameID = await hostGame(pages[0], 'Alice');
    await joinGame(pages[1], 'Bob', gameID);
    await joinGame(pages[2], 'Carol', gameID);
    await expect(pages[0].locator('li')).toHaveCount(3, { timeout: 10000 });

    console.log('▶ Starting game...');
    await pages[0].getByRole('button', { name: /Start Game/i }).click();
    await Promise.all(pages.map(p => p.waitForURL('**/game', { timeout: 15000 })));
    console.log('✓ All 3 on /game');

    // ── Seed a one-player elimination ───────────────────────────
    // The current-turn player is the caller (only they can call Yaniv). Of the
    // other two, one survives and one is eliminated.
    const callerIdx = await waitForActiveIndex(pages);
    const [survivorIdx, eliminatedIdx] = [0, 1, 2].filter(i => i !== callerIdx);
    const eliminatedPage = pages[eliminatedIdx];

    console.log(`\n▶ Seeding scores=95; ${names[callerIdx]}=1 (wins), ${names[survivorIdx]}=2 (97 survives), ${names[eliminatedIdx]}=10 (105 eliminated)...`);
    await seedScores(pages[callerIdx], gameID, 95);
    await seedHand(pages[callerIdx], gameID, callerIdx, 1);
    await seedHand(pages[survivorIdx], gameID, survivorIdx, 2);
    await seedHand(eliminatedPage, gameID, eliminatedIdx, 10);

    await expect(pages[callerIdx].getByRole('button', { name: 'YANIV' })).toBeEnabled({ timeout: 10000 });

    // ── Call Yaniv → one elimination, game continues ────────────
    console.log(`\n▶ ${names[callerIdx]} calls Yaniv...`);
    await pages[callerIdx].getByRole('button', { name: 'YANIV' }).click();

    // The eliminated player is offered the spectator prompt once the next round
    // begins (~round delay + reveal). Web-first wait covers that latency.
    await expect(eliminatedPage.locator('.spectator-prompt-overlay')).toBeVisible({ timeout: 20000 });
    await expect(eliminatedPage.locator('.spectator-prompt-overlay')).toContainText('eliminated');
    console.log(`  ✓ ${names[eliminatedIdx]} is offered the spectator prompt`);

    // ── Choose to watch → spectator view ────────────────────────
    console.log(`▶ ${names[eliminatedIdx]} clicks Watch...`);
    await eliminatedPage.locator('.spectator-btn-watch').click();

    // Spectator view: the board + a Home (Leave game) button, and crucially NO
    // own hand and NO YANIV button (the eliminated player can only watch).
    await expect(eliminatedPage.locator('.game-board')).toBeVisible({ timeout: 5000 });
    await expect(eliminatedPage.getByRole('button', { name: /leave game/i })).toBeVisible();
    await expect(eliminatedPage.locator('.hand')).toHaveCount(0);
    await expect(eliminatedPage.getByRole('button', { name: 'YANIV' })).toHaveCount(0);
    console.log(`  ✓ ${names[eliminatedIdx]} is now spectating (board + Home (Leave game), no hand, no YANIV)`);

    console.log('\n✅ Spectator checks passed!');
  } finally {
    await browser.close();
  }
});
