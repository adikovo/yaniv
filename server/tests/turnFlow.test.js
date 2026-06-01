const { createTestServer } = require('./helpers/setup');
const { games } = require('../globals');

const TIMEOUT = 3000;

describe('Atomic turn flow', () => {
    let server, gameID, player0, player1, connectClient, closeServer;

    beforeEach(async () => {
        ({ gameID, player0, player1, connectClient, closeServer } = await createTestServer());
    });

    afterEach(async () => {
        await closeServer();
    });

    // ── T006 ──────────────────────────────────────────────────────────────────
    test('draw from deck discards selected card and draws atomically', done => {
        connectClient(player0).then(client => {
            const initialHand = [...games[gameID].players[0].hand];
            const discardedCard = initialHand[0];

            client.once('hand', ({ hand }) => {
                // Hand size must stay the same: -1 discarded +1 drawn = 5
                expect(hand.length).toBe(initialHand.length);

                // The discarded card must no longer be in the hand
                const stillThere = hand.some(
                    c => c.value === discardedCard.value && c.suit === discardedCard.suit
                );
                expect(stillThere).toBe(false);

                client.disconnect();
                done();
            });

            client.emit('makeTurn', gameID, {
                type: 'cardFromDeck',
                selected_cards: [0]
            });
        });
    }, TIMEOUT);

    // ── T007 ──────────────────────────────────────────────────────────────────
    test('draw from top card discards selected card and draws atomically', done => {
        connectClient(player0).then(client => {
            const initialHand = [...games[gameID].players[0].hand];
            const discardedCard = initialHand[0];

            client.once('hand', ({ hand }) => {
                expect(hand.length).toBe(initialHand.length);

                const stillThere = hand.some(
                    c => c.value === discardedCard.value && c.suit === discardedCard.suit
                );
                expect(stillThere).toBe(false);

                client.disconnect();
                done();
            });

            client.emit('makeTurn', gameID, {
                type: 'cardFromTop',
                side: 'end',
                selected_cards: [0]
            });
        });
    }, TIMEOUT);

    // ── T008 ──────────────────────────────────────────────────────────────────
    test('draw with no selected cards emits error and does not change state', done => {
        connectClient(player0).then(client => {
            const handBefore = [...games[gameID].players[0].hand];

            client.once('turnError', ({ message }) => {
                expect(message).toBeTruthy();

                // Game state must be unchanged
                const handAfter = games[gameID].players[0].hand;
                expect(handAfter.length).toBe(handBefore.length);

                client.disconnect();
                done();
            });

            client.emit('makeTurn', gameID, {
                type: 'cardFromDeck',
                selected_cards: []
            });
        });
    }, TIMEOUT);

    // ── T008b ─────────────────────────────────────────────────────────────────
    test('discarding two same-value cards selected in reverse order leaves correct hand size', done => {
        connectClient(player0).then(client => {
            // Give player0 exactly 2 cards so after discard+draw they should have exactly 1
            const makeCard = (value, suit, nv) => ({ value, suit, numeric_val: nv, index: 0 });
            games[gameID].players[0].hand = [makeCard('2', 'H', 2), makeCard('2', 'C', 2)];
            games[gameID].players[0].hand[1].index = 1;
            games[gameID].players[0].sum = 4;

            client.once('hand', ({ hand }) => {
                try {
                    expect(hand.length).toBe(1);
                    client.disconnect();
                    done();
                } catch (err) { done(err); }
            });

            // selected_cards in reverse order — highest index first
            client.emit('makeTurn', gameID, {
                type: 'cardFromDeck',
                selected_cards: [1, 0]
            });
        });
    }, TIMEOUT);

    // ── T009 ──────────────────────────────────────────────────────────────────
    test('out-of-turn draw is rejected and game state unchanged', done => {
        Promise.all([connectClient(player0), connectClient(player1)]).then(([client0, client1]) => {
            const handBefore = [...games[gameID].players[1].hand];
            const topCardBefore = [...games[gameID].game_state.top_card];

            // player1 tries to act but it's player0's turn
            client1.emit('makeTurn', gameID, {
                type: 'cardFromDeck',
                selected_cards: [0]
            });

            // Wait briefly then verify nothing changed
            setTimeout(() => {
                expect(games[gameID].players[1].hand.length).toBe(handBefore.length);
                expect(games[gameID].game_state.top_card.length).toBe(topCardBefore.length);

                client0.disconnect();
                client1.disconnect();
                done();
            }, 300);
        });
    }, TIMEOUT);
});
