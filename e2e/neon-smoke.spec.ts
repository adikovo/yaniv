import { test, expect, chromium } from '@playwright/test';
import { hostGame, joinGame, BASE } from './helpers';

// Neon redesign happy-path smoke (feature 014, T028). Exercises the redesigned
// UI un-mocked with 2 players (Alice host, Bob join): welcome wordmark, lobby
// game ID + copy button, game-board + 5-card hands, the Home corner button, and
// the US4 leave-the-game confirm dialog (No keeps you in, Yes returns to welcome).
test('neon smoke: welcome → lobby → game → leave dialog (US4)', async () => {
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

  try {
    // ── Step 1: Welcome screen renders redesigned ─────────────────
    console.log('\n▶ Checking redesigned welcome screen...');
    await alicePage.goto(BASE);
    await expect(alicePage.locator('.wordmark-title')).toHaveText('YANIV');
    await expect(alicePage.getByRole('button', { name: 'Host a Game' })).toBeVisible();
    await expect(alicePage.getByRole('button', { name: 'Join a Game' })).toBeVisible();
    console.log('  ✓ YANIV wordmark + Host/Join buttons visible');

    // ── Step 2: Alice hosts ───────────────────────────────────────
    console.log('\n▶ Alice hosting game...');
    const gameID = await hostGame(alicePage, 'Alice');
    expect(gameID).toBeTruthy();
    await expect(alicePage).toHaveURL(/\/lobby/);
    await expect(alicePage.locator('.gameid-value')).toBeVisible();
    await expect(alicePage.locator('.gameid-value')).not.toBeEmpty();
    await expect(alicePage.locator('[aria-label="Copy game ID"]')).toBeVisible();
    console.log(`  ✓ Alice in lobby; Game ID ${gameID}, copy button present`);

    // ── Step 3: Bob joins → both lobbies show 2 player rows ───────
    console.log('\n▶ Bob joining...');
    await joinGame(bobPage, 'Bob', gameID);
    await expect(alicePage.locator('li.player-row')).toHaveCount(2, { timeout: 10000 });
    await expect(bobPage.locator('li.player-row')).toHaveCount(2, { timeout: 10000 });
    console.log('  ✓ Both lobbies show 2 player rows');

    // ── Step 4: Start game → both reach /game with 5-card hands ───
    console.log('\n▶ Starting game...');
    await alicePage.getByRole('button', { name: /Start Game/i }).click();
    await Promise.all(pages.map(p => p.waitForURL('**/game', { timeout: 15000 })));
    for (const [i, page] of pages.entries()) {
      await expect(page.locator('.game-board')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.hand .card')).toHaveCount(5, { timeout: 10000 });
      console.log(`  ✓ ${['Alice', 'Bob'][i]}: game-board rendered, 5 cards in hand`);
    }

    // ── Step 5: Redesign specifics on the game screen ─────────────
    console.log('\n▶ Checking game-screen redesign specifics...');
    await expect(alicePage.getByRole('button', { name: /leave game/i })).toBeVisible();
    await expect(alicePage.locator('.game-board')).toBeVisible();
    console.log('  ✓ Home corner button visible; game-board present (neon menu gone)');

    // ── Step 6: US4 leave flow — No keeps you in, Yes returns home ─
    console.log('\n▶ Alice opens the leave dialog and clicks No...');
    await alicePage.getByRole('button', { name: /leave game/i }).click();
    await expect(alicePage.getByRole('heading', { name: 'Leave the game?' })).toBeVisible();
    await alicePage.getByRole('button', { name: 'No' }).click();
    await expect(alicePage.getByRole('heading', { name: 'Leave the game?' })).toHaveCount(0);
    await expect(alicePage).toHaveURL(/\/game/);
    await expect(alicePage.locator('.game-board')).toBeVisible();
    console.log('  ✓ Dialog dismissed; Alice still on /game');

    console.log('▶ Alice opens the leave dialog again and clicks Yes...');
    await alicePage.getByRole('button', { name: /leave game/i }).click();
    await expect(alicePage.getByRole('heading', { name: 'Leave the game?' })).toBeVisible();
    await alicePage.getByRole('button', { name: 'Yes' }).click();

    // Alice returns to the welcome screen.
    await alicePage.waitForURL('**/', { timeout: 10000 });
    expect(new URL(alicePage.url()).pathname).toBe('/');
    await expect(alicePage.locator('.wordmark-title')).toHaveText('YANIV');
    await expect(alicePage.getByRole('button', { name: 'Host a Game' })).toBeVisible();
    console.log('  ✓ Alice back on the welcome screen');

    // Bob is unaffected by Alice's *navigation* — he is NOT yanked back to the
    // welcome screen; he stays on the /game route. In a 2-player game Alice
    // leaving leaves Bob alone, so the server ends the game and Bob sees the
    // game-over overlay (he wins by default) rather than the live board.
    await expect(bobPage).toHaveURL(/\/game/);
    await expect(bobPage.locator('.round-result-overlay')).toBeVisible({ timeout: 10000 });
    console.log('  ✓ Bob unaffected (still on /game, sees game-over overlay — wins by default)');

    console.log('\n✅ Neon smoke checks passed!');

    // Local-only: keep windows open briefly for visual inspection. Skipped in CI.
    if (!process.env.CI) {
      await pages[0].waitForTimeout(5000);
    }
  } finally {
    await browser.close();
  }
});
