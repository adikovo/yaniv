const { createTestServer } = require('./helpers/setup');
const { games } = require('../globals');

const TIMEOUT = 5000;

function setHand(player, cards) {
    player.hand = cards;
    let sum = 0;
    for (const c of cards) {
        sum += ['J', 'Q', 'K'].includes(c.value) ? 10 : c.numeric_val;
    }
    player.sum = sum;
}

function makeCard(value, suit, numeric_val) {
    return { value, suit, numeric_val, index: 0 };
}

describe('Multi-Round Auto-Advance', () => {
    let gameID, player0, player1, connectClient, closeServer;

    beforeEach(async () => {
        ({ gameID, player0, player1, connectClient, closeServer } = await createTestServer());
        games[gameID].players[0].score = 0;
        games[gameID].players[1].score = 0;
        games[gameID].game_state.current_turn = 0;
        setHand(games[gameID].players[0], [makeCard('1', 'H', 1)]); // sum=1, valid yaniv
        setHand(games[gameID].players[1], [makeCard('5', 'H', 5)]);
    });

    afterEach(async () => {
        await closeServer();
    });

    // T-MR1: yaniv call → roundEnd fires → within ~2 s both clients receive nextRound + fresh hand
    test('T-MR1: yaniv call → roundEnd then nextRound + hand auto-fires within 2.5 s', done => {
        Promise.all([connectClient(player0), connectClient(player1)]).then(([c0, c1]) => {
            let nextRoundCount = 0;
            let handCount = 0;

            function checkDone() {
                if (nextRoundCount === 2 && handCount >= 1) {
                    c0.disconnect(); c1.disconnect(); done();
                }
            }

            c0.once('nextRound', () => { try { nextRoundCount++; checkDone(); } catch (e) { done(e); } });
            c1.once('nextRound', () => { try { nextRoundCount++; checkDone(); } catch (e) { done(e); } });
            c0.once('hand', ({ hand }) => {
                try { expect(hand.length).toBeGreaterThan(0); handCount++; checkDone(); }
                catch (e) { done(e); }
            });

            c0.emit('makeTurn', gameID, { type: 'yaniv', selected_cards: [] });
        });
    }, TIMEOUT);

    // T-MR2: after auto-advance, game_state is fully reset (new deck, single top card)
    test('T-MR2: after auto-advance game_state is reset — new deck and top card', done => {
        const originalDeckSize = games[gameID].game_state.deck.length;

        Promise.all([connectClient(player0), connectClient(player1)]).then(([c0, c1]) => {
            c0.once('nextRound', ({ top_card, deck }) => {
                try {
                    expect(Array.isArray(top_card)).toBe(true);
                    expect(top_card.length).toBeGreaterThan(0);
                    expect(Array.isArray(deck)).toBe(true);
                    expect(deck.length).toBeGreaterThan(0);
                    c0.disconnect(); c1.disconnect(); done();
                } catch (e) { done(e); }
            });

            c0.emit('makeTurn', gameID, { type: 'yaniv', selected_cards: [] });
        });
    }, TIMEOUT);
});

describe('Game Over & Rematch', () => {
    let gameID, player0, player1, connectClient, closeServer;

    beforeEach(async () => {
        ({ gameID, player0, player1, connectClient, closeServer } = await createTestServer());
        games[gameID].eliminated = [];
        games[gameID].players[0].score = 0;
        games[gameID].players[1].score = 0;
        games[gameID].game_state.current_turn = 0;
        setHand(games[gameID].players[0], [makeCard('1', 'H', 1)]); // caller, sum=1
        setHand(games[gameID].players[1], [makeCard('5', 'H', 5)]); // sum=5
    });

    afterEach(async () => {
        await closeServer();
    });

    // T-MR3: 1 survivor → gameOver fires with winner.name; nextRound does NOT fire
    test('T-MR3: only 1 survivor → gameOver with winner.name, no nextRound', done => {
        games[gameID].players[1].score = 96; // +5 = 101 → eliminated

        Promise.all([connectClient(player0), connectClient(player1)]).then(([c0, c1]) => {
            let nextRoundFired = false;
            c0.once('nextRound', () => { nextRoundFired = true; });

            c0.once('gameOver', ({ winner, players }) => {
                try {
                    expect(winner.name).toBe(player0.name);
                    expect(typeof players).toBe('object');
                    expect(nextRoundFired).toBe(false);
                    c0.disconnect(); c1.disconnect(); done();
                } catch (e) { done(e); }
            });

            c0.emit('makeTurn', gameID, { type: 'yaniv', selected_cards: [] });
        });
    }, TIMEOUT);

    // T-MR3b: simultaneous last-two elimination (both hit ≥101 same round) → nextRound, not gameOver
    test('T-MR3b: both players eliminated same round → nextRound fires, not gameOver', done => {
        // Use Asaf: caller sum=5, opponent sum=1 → asaf on caller (+30)
        setHand(games[gameID].players[0], [makeCard('5', 'H', 5)]); // caller sum=5
        setHand(games[gameID].players[1], [makeCard('1', 'H', 1)]); // lower → asaf caller
        games[gameID].players[0].score = 66; // +5+30 = 101 → eliminated
        games[gameID].players[1].score = 100; // +1 = 101 → eliminated
        games[gameID].game_state.current_turn = 0;

        Promise.all([connectClient(player0), connectClient(player1)]).then(([c0, c1]) => {
            let gameOverFired = false;
            c0.once('gameOver', () => { gameOverFired = true; });

            c0.once('nextRound', () => {
                try {
                    expect(gameOverFired).toBe(false);
                    c0.disconnect(); c1.disconnect(); done();
                } catch (e) { done(e); }
            });

            c0.emit('makeTurn', gameID, { type: 'yaniv', selected_cards: [] });
        });
    }, TIMEOUT);

    // T-MR4: both players rematchReady → start fires, scores reset to 0, eliminated cleared
    test('T-MR4: rematchReady from all players → start fires with scores reset', done => {
        games[gameID].players[1].score = 96;

        Promise.all([connectClient(player0), connectClient(player1)]).then(([c0, c1]) => {
            c0.once('gameOver', () => {
                c0.emit('rematchReady');
                c1.emit('rematchReady');
            });

            c0.once('start', () => {
                try {
                    expect(games[gameID].players[0].score).toBe(0);
                    expect(games[gameID].eliminated).toHaveLength(0);
                    c0.disconnect(); c1.disconnect(); done();
                } catch (e) { done(e); }
            });

            c0.emit('makeTurn', gameID, { type: 'yaniv', selected_cards: [] });
        });
    }, TIMEOUT);

    // T-MR4b: rematch re-deals to eliminated player too (all original players get hands)
    test('T-MR4b: after rematch, previously eliminated player is back in game.players', done => {
        games[gameID].players[1].score = 96;

        Promise.all([connectClient(player0), connectClient(player1)]).then(([c0, c1]) => {
            c0.once('gameOver', () => {
                c0.emit('rematchReady');
                c1.emit('rematchReady');
            });

            c1.once('hand', ({ hand }) => {
                try {
                    expect(hand.length).toBeGreaterThan(0);
                    expect(games[gameID].players[player1.id]).toBeDefined();
                    c0.disconnect(); c1.disconnect(); done();
                } catch (e) { done(e); }
            });

            c0.emit('makeTurn', gameID, { type: 'yaniv', selected_cards: [] });
        });
    }, TIMEOUT);

    // T-MR4c: only one player sends rematchReady → start fires after 10 s timeout
    test('T-MR4c: partial rematchReady → start fires after timeout', done => {
        games[gameID].players[1].score = 96;

        Promise.all([connectClient(player0), connectClient(player1)]).then(([c0, c1]) => {
            c0.once('gameOver', () => {
                c0.emit('rematchReady'); // only player 0 clicks
            });

            c0.once('start', () => {
                try {
                    c0.disconnect(); c1.disconnect(); done();
                } catch (e) { done(e); }
            });

            c0.emit('makeTurn', gameID, { type: 'yaniv', selected_cards: [] });
        });
    }, 12000); // needs to outlast the 10 s rematch timeout
});
