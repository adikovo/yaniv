const { createTestServer } = require('./helpers/setup');
const { games } = require('../globals');

const TIMEOUT = 5000 * (process.env.CI ? 3 : 1);

// Pre-start lobby = the room exists (created at HTTP /host) but the game has not
// started, so `games[room].game_state` is absent. The helper seeds a *started*
// game, so each pre-start block deletes game_state to reach the lobby branch.
// A short settle delay after connecting lets the join-time `playersUpdate`
// broadcasts flush before we assert on the one triggered by the departure.
const SETTLE_MS = 100;

describe('Lobby leave/disconnect broadcast (pre-start)', () => {

    // ── US1: explicit Leave updates remaining lobby rosters ──────────────────
    describe('US1: explicit leave', () => {
        let server;
        beforeEach(async () => {
            server = await createTestServer({ playerCount: 3 });
            delete games[server.gameID].game_state; // force pre-start lobby
        });
        afterEach(async () => { await server.closeServer(); });

        // T002
        test('remaining members receive playersUpdate excluding the leaver', done => {
            const { player0, player1, player2, connectClient } = server;
            Promise.all([connectClient(player0), connectClient(player1), connectClient(player2)])
                .then(([c0, c1, c2]) => {
                    setTimeout(() => {
                        c0.once('playersUpdate', ({ players }) => {
                            try {
                                expect(players).toHaveLength(2);
                                expect(players.map(p => p.id)).not.toContain(2);
                                c0.disconnect(); c1.disconnect(); c2.disconnect();
                                done();
                            } catch (e) { done(e); }
                        });
                        c2.emit('leaveRoom');
                    }, SETTLE_MS);
                });
        }, TIMEOUT);
    });

    // ── US2: disconnect updates remaining lobby rosters ──────────────────────
    describe('US2: disconnect', () => {
        let server;
        beforeEach(async () => {
            server = await createTestServer({ playerCount: 3 });
            delete games[server.gameID].game_state; // force pre-start lobby
        });
        afterEach(async () => { await server.closeServer(); });

        // T005
        test('remaining members receive playersUpdate excluding the disconnected player', done => {
            const { player0, player1, player2, connectClient } = server;
            Promise.all([connectClient(player0), connectClient(player1), connectClient(player2)])
                .then(([c0, c1, c2]) => {
                    setTimeout(() => {
                        c0.once('playersUpdate', ({ players }) => {
                            try {
                                expect(players).toHaveLength(2);
                                expect(players.map(p => p.id)).not.toContain(2);
                                c0.disconnect(); c1.disconnect();
                                done();
                            } catch (e) { done(e); }
                        });
                        c2.disconnect();
                    }, SETTLE_MS);
                });
        }, TIMEOUT);
    });

    // ── T006: in-game regression guard (FR-006) ───────────────────────────────
    // With game_state present (started game), disconnect must still emit
    // playerDisconnected + gameOver, NOT playersUpdate.
    describe('T006: in-game path unchanged after fix', () => {
        let server;
        beforeEach(async () => {
            server = await createTestServer({ playerCount: 2 });
            // do NOT delete game_state — leave the helper's started game intact
        });
        afterEach(async () => { await server.closeServer(); });

        test('post-start disconnect still emits playerDisconnected (not playersUpdate)', done => {
            const { player0, player1, connectClient } = server;
            Promise.all([connectClient(player0), connectClient(player1)])
                .then(([c0, c1]) => {
                    let playersUpdateFired = false;
                    c0.on('playersUpdate', () => { playersUpdateFired = true; });
                    c0.once('playerDisconnected', ({ name }) => {
                        setTimeout(() => {
                            try {
                                expect(name).toBe('Bob');
                                expect(playersUpdateFired).toBe(false);
                                c0.disconnect();
                                done();
                            } catch (e) { done(e); }
                        }, 150);
                    });
                    c1.disconnect();
                });
        }, TIMEOUT);
    });

    // ── T007: edge case — last player leaves an empty pre-start room ──────────
    describe('T007: last player leaving a pre-start room', () => {
        let server;
        beforeEach(async () => {
            server = await createTestServer({ playerCount: 1 });
            delete games[server.gameID].game_state; // force pre-start lobby
        });
        afterEach(async () => { await server.closeServer(); });

        test('room is cleaned up with no error and no broadcast', done => {
            const { gameID, player0, connectClient } = server;
            connectClient(player0).then(c0 => {
                setTimeout(() => {
                    c0.emit('leaveRoom');
                    setTimeout(() => {
                        try {
                            expect(games[gameID]).toBeUndefined();
                            done();
                        } catch (e) { done(e); }
                    }, 200);
                }, SETTLE_MS);
            });
        }, TIMEOUT);
    });

    // ── US1: a pre-start leave must NOT emit the in-game gameOver ─────────────
    // 2-player room: with the bug, removing one player leaves 1 → the in-game
    // block would emit gameOver. After the fix, only playersUpdate fires.
    describe('US1: no spurious gameOver on leave', () => {
        let server;
        beforeEach(async () => {
            server = await createTestServer({ playerCount: 2 });
            delete games[server.gameID].game_state; // force pre-start lobby
        });
        afterEach(async () => { await server.closeServer(); });

        // T003
        test('remaining member gets playersUpdate and NOT gameOver', done => {
            const { player0, player1, connectClient } = server;
            Promise.all([connectClient(player0), connectClient(player1)])
                .then(([c0, c1]) => {
                    setTimeout(() => {
                        let gameOverFired = false;
                        c0.on('gameOver', () => { gameOverFired = true; });
                        c0.once('playersUpdate', ({ players }) => {
                            // wait a beat to be sure no gameOver trails behind
                            setTimeout(() => {
                                try {
                                    expect(players).toHaveLength(1);
                                    expect(players.map(p => p.id)).not.toContain(1);
                                    expect(gameOverFired).toBe(false);
                                    c0.disconnect(); c1.disconnect();
                                    done();
                                } catch (e) { done(e); }
                            }, 200);
                        });
                        c1.emit('leaveRoom');
                    }, SETTLE_MS);
                });
        }, TIMEOUT);
    });
});
