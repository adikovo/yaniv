import { test, expect, chromium } from '@playwright/test';
import { hostGame, joinGame } from './helpers';

// A player dropping mid-game hits two different server branches by player count,
// and the *effect on the other clients' UI* can't be covered by a server unit
// test. Closing a browser context drops that player's socket → server fires
// 'disconnect'.

// ── 2 players: one drops → the other wins by default (gameOver) ───────────────
// With only 2 players, a disconnect leaves 1 (`remaining === 1`), so the server
// emits gameOver with reason 'disconnect'. The remaining player sees the
// game-over overlay WITHOUT a Rematch button (canRematch is false for a
// disconnect — you can't rematch a player who left).
test('2-player: opponent disconnect ends the game (gameOver, no rematch)', async () => {
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

  try {
    console.log('\n▶ Alice hosting + Bob joining...');
    const gameID = await hostGame(alicePage, 'Alice');
    await joinGame(bobPage, 'Bob', gameID);
    await expect(alicePage.locator('li')).toHaveCount(1, { timeout: 10000 });

    console.log('▶ Starting game...');
    await alicePage.getByRole('button', { name: /Start Game/i }).click();
    await Promise.all([alicePage, bobPage].map(p => p.waitForURL('**/game', { timeout: 15000 })));
    await expect(alicePage.locator('.opponent-area')).toHaveCount(1, { timeout: 10000 });
    console.log('✓ Both players on /game');

    // ── Bob disconnects (close his context → socket drops) ──────
    console.log('\n▶ Bob disconnecting...');
    await bobCtx.close();

    // Alice should land on the game-over overlay as the default winner.
    await expect(alicePage.locator('.round-result-overlay')).toBeVisible({ timeout: 10000 });
    await expect(alicePage.locator('.round-result-overlay h2')).toContainText('Alice wins', { timeout: 5000 });
    console.log('✓ Alice sees the game-over overlay (she wins by default)');

    // A disconnect game-over is not rematchable: Go Home is offered, Rematch is not.
    await expect(alicePage.locator('.round-result-home-btn')).toBeVisible();
    await expect(alicePage.locator('.round-result-next-btn')).toHaveCount(0);
    console.log('✓ Go Home shown, Rematch button absent (canRematch=false on disconnect)');

    console.log('\n✅ 2-player disconnect → gameOver checks passed!');
  } finally {
    await browser.close();
  }
});

// ── 3 players: one drops → game continues for the rest ────────────────────────
// With 3 players, a disconnect leaves 2 (`remaining >= 2`), so the game does NOT
// end. The remaining clients show a transient disconnect notice and drop the
// leaver's opponent area (3 players → 2 opponents each → 1 after the drop).
test('3-player: one disconnect keeps the game going for the others', async () => {
  const browser = await chromium.launch({
    headless: !!process.env.CI,
    slowMo: process.env.CI ? 0 : 300,
  });

  const [aliceCtx, bobCtx, carolCtx] = await Promise.all([
    browser.newContext({ viewport: { width: 900, height: 700 } }),
    browser.newContext({ viewport: { width: 900, height: 700 } }),
    browser.newContext({ viewport: { width: 900, height: 700 } }),
  ]);
  const alicePage = await aliceCtx.newPage();
  const bobPage = await bobCtx.newPage();
  const carolPage = await carolCtx.newPage();

  try {
    console.log('\n▶ Alice hosting; Bob + Carol joining...');
    const gameID = await hostGame(alicePage, 'Alice');
    await joinGame(bobPage, 'Bob', gameID);
    await joinGame(carolPage, 'Carol', gameID);
    await expect(alicePage.locator('li')).toHaveCount(2, { timeout: 10000 });

    console.log('▶ Starting game...');
    await alicePage.getByRole('button', { name: /Start Game/i }).click();
    await Promise.all([alicePage, bobPage, carolPage].map(p => p.waitForURL('**/game', { timeout: 15000 })));
    // Each player sees 2 opponent areas to start.
    await expect(alicePage.locator('.opponent-area')).toHaveCount(2, { timeout: 10000 });
    console.log('✓ All 3 on /game, Alice sees 2 opponents');

    // ── Carol disconnects ───────────────────────────────────────
    console.log('\n▶ Carol disconnecting...');
    await carolCtx.close();

    // Alice gets a transient "Carol has left the game" notice...
    await expect(alicePage.locator('.disconnect-notice')).toContainText('Carol', { timeout: 8000 });
    console.log('✓ Alice sees the disconnect notice for Carol');

    // ...the game keeps going (no game-over overlay)...
    await expect(alicePage.locator('.round-result-overlay')).toHaveCount(0);

    // ...and Carol's opponent area is removed (2 opponents → 1).
    await expect(alicePage.locator('.opponent-area')).toHaveCount(1, { timeout: 8000 });
    await expect(bobPage.locator('.opponent-area')).toHaveCount(1, { timeout: 8000 });
    console.log('✓ Game continues; Carol removed (Alice + Bob each see 1 opponent)');

    console.log('\n✅ 3-player disconnect → continue checks passed!');
  } finally {
    await browser.close();
  }
});
