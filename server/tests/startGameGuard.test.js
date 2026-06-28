const { createTestServer } = require('./helpers/setup');
const { games } = require('../globals');

const TIMEOUT = 5000 * (process.env.CI ? 3 : 1);
const SETTLE_MS = 100;

describe('startGame — minimum-player guard', () => {
    // ── T001: solo host cannot start a game ──────────────────────────────────
    describe('T001: single player emits startGame', () => {
        let server;
        beforeEach(async () => {
            server = await createTestServer({ playerCount: 1 });
            delete games[server.gameID].game_state; // force pre-start lobby
        });
        afterEach(async () => { await server.closeServer(); });

        test('does not emit start when only 1 player is in the room', done => {
            const { player0, connectClient } = server;
            connectClient(player0).then(c0 => {
                setTimeout(() => {
                    let startFired = false;
                    c0.on('start', () => { startFired = true; });
                    c0.emit('startGame');
                    setTimeout(() => {
                        try {
                            expect(startFired).toBe(false);
                            c0.disconnect();
                            done();
                        } catch (e) { done(e); }
                    }, 200);
                }, SETTLE_MS);
            });
        }, TIMEOUT);
    });

    // ── T002: two players — start proceeds normally ──────────────────────────
    describe('T002: two players emit startGame', () => {
        let server;
        beforeEach(async () => {
            server = await createTestServer({ playerCount: 2 });
            delete games[server.gameID].game_state; // force pre-start lobby
        });
        afterEach(async () => { await server.closeServer(); });

        test('emits start to both players when 2 are in the room', done => {
            const { player0, player1, connectClient } = server;
            Promise.all([connectClient(player0), connectClient(player1)])
                .then(([c0, c1]) => {
                    setTimeout(() => {
                        c0.once('start', () => {
                            try {
                                c0.disconnect(); c1.disconnect();
                                done();
                            } catch (e) { done(e); }
                        });
                        c0.emit('startGame');
                    }, SETTLE_MS);
                });
        }, TIMEOUT);
    });
});
