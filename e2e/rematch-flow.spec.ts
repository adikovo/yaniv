import { test, expect, chromium } from '@playwright/test';
import {
  hostGame,
  joinGame,
  playUntilYanivReady,
  seedScores,
} from './helpers';

// ── Test A ────────────────────────────────────────────────────────────────────
//
// Verifies Bug 1 fix: when the rematch countdown reaches 0 and fewer than 2
// players clicked Rematch, the server emits rematchCancelled and every client
// navigates to '/'.
//
// Setup  : 2 players. Play a full game to the round-result overlay.
// Action : p0 clicks Go Home immediately; p1 does nothing (idles through countdown).
// Assert : p0 lands on '/' promptly; p1 lands on '/' once the countdown expires.

test('2-player: idle player goes home when timer expires, ready player also goes home (cancelled)', async () => {
  test.setTimeout(120000);

  const browser = await chromium.launch({ headless: false, slowMo: 400 });

  const [p0Ctx, p1Ctx] = await Promise.all([
    browser.newContext({ viewport: { width: 900, height: 700 } }),
    browser.newContext({ viewport: { width: 900, height: 700 } }),
  ]);
  const p0 = await p0Ctx.newPage(); // host — will click Go Home
  const p1 = await p1Ctx.newPage(); // joiner — will idle until countdown expires
  const pages = [p0, p1];
  const names = ['Alice', 'Bob'];

  try {
    // ── Step 1: Host + join ─────────────────────────────────────
    console.log('\n▶ Alice hosting game...');
    const gameID = await hostGame(p0, 'Alice');
    console.log(`  Game ID: ${gameID}`);
    expect(gameID).toBeTruthy();

    console.log('▶ Bob joining...');
    await joinGame(p1, 'Bob', gameID);
    await expect(p0.locator('li')).toHaveCount(1, { timeout: 10000 });
    console.log('✓ Both players in lobby');

    // ── Step 2: Start game ──────────────────────────────────────
    console.log('\n▶ Starting game...');
    await p0.getByRole('button', { name: /Start Game/i }).click();
    await Promise.all(pages.map(p => p.waitForURL('**/game', { timeout: 15000 })));
    console.log('✓ Both players on /game');

    await pages[0].waitForTimeout(1500);

    // ── Step 3: Play until someone can call Yaniv ───────────────
    console.log('\n▶ Playing turns until a player can call Yaniv (sum ≤ 7)...');
    const { yanivCaller, yanivCallerName } = await playUntilYanivReady(pages, names);

    // Seed both players to 99 so this single Yaniv call ends the game.
    console.log('\n▶ Seeding both players to score 99 so this round ends the game...');
    await seedScores(yanivCaller, gameID, 99);

    // ── Step 4: Call Yaniv ──────────────────────────────────────
    console.log(`\n▶ ${yanivCallerName} calls Yaniv!`);
    await yanivCaller.getByRole('button', { name: 'YANIV' }).click();

    // Wait for the round-result overlay on both pages
    console.log('▶ Waiting for round-result overlay on both pages...');
    await Promise.all(pages.map(p =>
      expect(p.locator('.round-result-overlay')).toBeVisible({ timeout: 30000 })
    ));
    console.log('✓ round-result-overlay visible on both pages');

    // ── Step 5: p0 clicks Go Home; p1 idles ────────────────────
    console.log('\n▶ p0 (Alice) clicking Go Home immediately...');
    await p0.getByRole('button', { name: 'Go Home' }).click();

    // p0 should land on '/' promptly
    await p0.waitForURL('**/', { timeout: 10000 });
    expect(new URL(p0.url()).pathname).toBe('/');
    console.log('✓ p0 (Alice) landed on home page after clicking Go Home');

    // p1 does nothing — the RoundResult countdown will reach 0, emit leaveRoom,
    // and navigate to '/'. Allow up to 20 s for the full 10-second countdown.
    console.log('▶ p1 (Bob) waiting for countdown to expire and auto-navigate to /...');
    await p1.waitForURL('**/', { timeout: 20000 });
    expect(new URL(p1.url()).pathname).toBe('/');
    console.log('✓ p1 (Bob) landed on home page after countdown expired');

    console.log('\n✅ Test A passed: both players ended on home page — rematch cancelled by timer');
  } finally {
    await browser.close();
  }
});

// ── Test B ────────────────────────────────────────────────────────────────────
//
// Verifies Bug 2 fix: hosting/joining a new game after a completed game does
// NOT show the stale winner overlay from the previous game.
//
// resetGame() is called inside hostGameClicked/joinGameClicked, and the context's
// handleStart clears gameOverData, so the game board should be the only thing
// visible when the second game starts.
//
// Setup  : 2 players. Play a full game to the round-result overlay.
// Action : Both click Go Home. p0 hosts a new game; p1 joins. p0 starts the game.
// Assert : .round-result-overlay is NOT visible on either page.
//          .game-board IS visible on both pages.

test('hosting a new game after a previous game shows the game board, not the winner overlay', async () => {
  test.setTimeout(120000);

  const browser = await chromium.launch({ headless: false, slowMo: 400 });

  const [p0Ctx, p1Ctx] = await Promise.all([
    browser.newContext({ viewport: { width: 900, height: 700 } }),
    browser.newContext({ viewport: { width: 900, height: 700 } }),
  ]);
  const p0 = await p0Ctx.newPage(); // host
  const p1 = await p1Ctx.newPage(); // joiner
  const pages = [p0, p1];
  const names = ['Alice', 'Bob'];

  try {
    // ── Step 1: First game ──────────────────────────────────────
    console.log('\n▶ Alice hosting first game...');
    const gameID = await hostGame(p0, 'Alice');
    console.log(`  Game ID: ${gameID}`);
    expect(gameID).toBeTruthy();

    console.log('▶ Bob joining first game...');
    await joinGame(p1, 'Bob', gameID);
    await expect(p0.locator('li')).toHaveCount(1, { timeout: 10000 });
    console.log('✓ Both players in lobby');

    console.log('\n▶ Starting first game...');
    await p0.getByRole('button', { name: /Start Game/i }).click();
    await Promise.all(pages.map(p => p.waitForURL('**/game', { timeout: 15000 })));
    console.log('✓ Both players on /game');

    await pages[0].waitForTimeout(1500);

    // ── Step 2: Play until someone can call Yaniv ───────────────
    console.log('\n▶ Playing turns until a player can call Yaniv (sum ≤ 7)...');
    const { yanivCaller, yanivCallerName } = await playUntilYanivReady(pages, names);

    // Seed both players to 99 so this single Yaniv call ends the first game.
    console.log('\n▶ Seeding both players to score 99 so this round ends the first game...');
    await seedScores(yanivCaller, gameID, 99);

    // ── Step 3: Call Yaniv ──────────────────────────────────────
    console.log(`\n▶ ${yanivCallerName} calls Yaniv!`);
    await yanivCaller.getByRole('button', { name: 'YANIV' }).click();

    // Wait for the round-result overlay on both pages
    console.log('▶ Waiting for round-result overlay on both pages...');
    await Promise.all(pages.map(p =>
      expect(p.locator('.round-result-overlay')).toBeVisible({ timeout: 30000 })
    ));
    console.log('✓ round-result-overlay visible on both pages');

    // ── Step 4: Both players navigate home ──────────────────────
    console.log('\n▶ p0 (Alice) clicking Go Home...');
    await p0.getByRole('button', { name: 'Go Home' }).click();
    await p0.waitForURL('**/', { timeout: 10000 });
    console.log('✓ p0 (Alice) landed on home page');

    console.log('▶ p1 (Bob) clicking Go Home...');
    await p1.getByRole('button', { name: 'Go Home' }).click();
    await p1.waitForURL('**/', { timeout: 10000 });
    console.log('✓ p1 (Bob) landed on home page');

    // ── Step 5: Start a second game ─────────────────────────────
    console.log('\n▶ Alice hosting second game...');
    const gameID2 = await hostGame(p0, 'Alice');
    console.log(`  New Game ID: ${gameID2}`);
    expect(gameID2).toBeTruthy();

    console.log('▶ Bob joining second game...');
    await joinGame(p1, 'Bob', gameID2);
    await expect(p0.locator('li')).toHaveCount(1, { timeout: 10000 });
    console.log('✓ Both players in second game lobby');

    console.log('\n▶ Starting second game...');
    await p0.getByRole('button', { name: /Start Game/i }).click();
    await Promise.all(pages.map(p => p.waitForURL('**/game', { timeout: 15000 })));
    console.log('✓ Both players on /game (second game)');

    await pages[0].waitForTimeout(1500);

    // ── Step 6: Assert no stale overlay; game board is present ──
    console.log('\n▶ Asserting no stale round-result-overlay on either page...');
    for (const [i, page] of pages.entries()) {
      await expect(page.locator('.round-result-overlay')).not.toBeVisible({ timeout: 5000 });
      console.log(`  ✓ ${names[i]}: .round-result-overlay is NOT visible`);
    }

    console.log('\n▶ Asserting .game-board is visible on both pages...');
    for (const [i, page] of pages.entries()) {
      await expect(page.locator('.game-board')).toBeVisible({ timeout: 5000 });
      console.log(`  ✓ ${names[i]}: .game-board IS visible`);
    }

    console.log('\n✅ Test B passed: second game shows game board without stale winner overlay');
  } finally {
    await browser.close();
  }
});
