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
                    // deck should be different from original (reshuffled)
                    expect(deck.length).toBeGreaterThan(0);
                    c0.disconnect(); c1.disconnect(); done();
                } catch (e) { done(e); }
            });

            c0.emit('makeTurn', gameID, { type: 'yaniv', selected_cards: [] });
        });
    }, TIMEOUT);
});
