const { createTestServer } = require('./helpers/setup');
const { games } = require('../globals');

const TIMEOUT = 4000;

// ── Phase 2: US1 — 3-player game continues after disconnect ──────────────────

describe('Disconnect — 3-player game continues (US1)', () => {
    let server;

    beforeEach(async () => {
        server = await createTestServer({ playerCount: 3 });
    });

    afterEach(async () => {
        await server.closeServer();
    });

    // T004
    test('T004 — disconnected player is removed from game.players', done => {
        const { gameID, player1, connectClient } = server;

        connectClient(player1).then(client => {
            client.on('disconnect', () => {
                setTimeout(() => {
                    expect(games[gameID].players[1]).toBeUndefined();
                    done();
                }, 100);
            });
            client.disconnect();
        });
    }, TIMEOUT);

    // T005
    test('T005 — playerDisconnected event emitted to remaining players', done => {
        const { player0, player1, connectClient } = server;

        Promise.all([connectClient(player0), connectClient(player1)]).then(([client0, client1]) => {
            client0.once('playerDisconnected', ({ name, id }) => {
                expect(name).toBe('Bob');
                expect(id).toBe(1);
                client0.disconnect();
                done();
            });
            client1.disconnect();
        });
    }, TIMEOUT);

    // T006 — it WAS the disconnected player's turn: turn must advance
    test('T006a — turn advances when the disconnecting player held the turn', done => {
        const { gameID, player0, player1, connectClient } = server;

        games[gameID].game_state.current_turn = 1;

        Promise.all([connectClient(player0), connectClient(player1)]).then(([client0, client1]) => {
            client0.once('turn', ({ current_turn }) => {
                expect(current_turn).not.toBe(1);
                client0.disconnect();
                done();
            });
            client1.disconnect();
        });
    }, TIMEOUT);

    // T006 — it was NOT the disconnected player's turn: no turn event should fire
    test('T006b — no turn event emitted when disconnecting player did not hold the turn', done => {
        const { gameID, player0, player1, connectClient } = server;

        games[gameID].game_state.current_turn = 0; // player1 disconnects, but it's player0's turn

        Promise.all([connectClient(player0), connectClient(player1)]).then(([client0, client1]) => {
            let turnFired = false;
            client0.on('turn', () => { turnFired = true; });

            client1.disconnect();

            // Wait long enough that a spurious turn event would have arrived
            setTimeout(() => {
                expect(turnFired).toBe(false);
                client0.disconnect();
                done();
            }, 500);
        });
    }, TIMEOUT);

    // T007
    test('T007 — turn event includes top_card and deck when turn advances', done => {
        const { gameID, player0, player1, connectClient } = server;

        games[gameID].game_state.current_turn = 1;

        Promise.all([connectClient(player0), connectClient(player1)]).then(([client0, client1]) => {
            client0.once('turn', ({ current_turn, top_card, deck }) => {
                expect(current_turn).toBeDefined();
                expect(top_card).toBeDefined();
                expect(deck).toBeDefined();
                client0.disconnect();
                done();
            });
            client1.disconnect();
        });
    }, TIMEOUT);
});

// ── Phase 3: US2 — game ends when only 1 player remains ──────────────────────

describe('Disconnect — game over when 1 player remains (US2)', () => {
    let server;

    afterEach(async () => {
        await server.closeServer();
    });

    // T009 + T010: 2-player game, one disconnects → gameOver emitted
    test('T009/T010 — gameOver emitted to remaining player after 2-player disconnect', done => {
        createTestServer({ playerCount: 2 }).then(s => {
            server = s;
            const { player0, player1, connectClient } = s;

            Promise.all([connectClient(player0), connectClient(player1)]).then(([client0, client1]) => {
                client0.once('gameOver', ({ winner }) => {
                    expect(winner.id).toBe(0);
                    expect(winner.name).toBe('Alice');
                    client0.disconnect();
                    done();
                });
                client1.disconnect();
            });
        });
    }, TIMEOUT);

    // T011: 0 players left — no crash (both disconnect almost simultaneously)
    test('T011 — no crash when all players disconnect', done => {
        createTestServer({ playerCount: 2 }).then(s => {
            server = s;
            const { player0, player1, connectClient } = s;

            Promise.all([connectClient(player0), connectClient(player1)]).then(([client0, client1]) => {
                // Disconnect both; just ensure no unhandled exception
                client0.disconnect();
                client1.disconnect();
                setTimeout(done, 400);
            });
        });
    }, TIMEOUT);

    // T012: 3-player game, one disconnects — must NOT emit gameOver
    test('T012 — no gameOver in 3-player game when one disconnects', done => {
        createTestServer({ playerCount: 3 }).then(s => {
            server = s;
            const { player0, player1, player2, connectClient } = s;

            Promise.all([connectClient(player0), connectClient(player1), connectClient(player2)]).then(([client0, client1, client2]) => {
                let gameOverFired = false;
                client0.on('gameOver', () => { gameOverFired = true; });

                client1.disconnect();

                setTimeout(() => {
                    expect(gameOverFired).toBe(false);
                    client0.disconnect();
                    client2.disconnect();
                    done();
                }, 500);
            });
        });
    }, TIMEOUT);
});
