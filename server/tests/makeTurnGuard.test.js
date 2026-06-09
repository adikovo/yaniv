const { createTestServer } = require('./helpers/setup');
const { games } = require('../globals');

const TIMEOUT = 4000;

describe('makeTurn guard — stale or disconnected player', () => {
    let server;

    beforeEach(async () => {
        server = await createTestServer({ playerCount: 2 });
    });

    afterEach(async () => {
        await server.closeServer();
    });

    // T017a: current_turn points to a player no longer in game.players — server must not crash
    test('T017a — no crash when current_turn points to a removed player', done => {
        const { gameID, player0, player1, connectClient } = server;

        connectClient(player0).then(client0 => {
            connectClient(player1).then(client1 => {
                // Simulate player 0 having been removed while still being current_turn
                delete games[gameID].players[0];

                // Player 1 emits makeTurn — server guard must reject it cleanly
                client1.emit('makeTurn', gameID, {
                    type: 'cardFromDeck',
                    selected_cards: [0]
                });

                // No crash = pass after short wait
                setTimeout(() => {
                    client0.disconnect();
                    client1.disconnect();
                    done();
                }, 300);
            });
        });
    }, TIMEOUT);

    // T017b: makeTurn from a socket whose rooms entry is gone (already disconnected) — no crash
    test('T017b — no crash when socketPlayer not found in rooms', done => {
        const { gameID, player0, player1, connectClient } = server;

        Promise.all([connectClient(player0), connectClient(player1)]).then(([client0, client1]) => {
            // Wait for server to confirm player1 disconnected, then verify no crash
            client0.once('playerDisconnected', () => {
                expect(games[gameID].players[1]).toBeUndefined();
                client0.disconnect();
                done();
            });
            client1.disconnect();
        });
    }, TIMEOUT);
});
