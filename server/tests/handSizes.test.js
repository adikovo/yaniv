const { createTestServer } = require('./helpers/setup');
const { games } = require('../globals');

const TIMEOUT = 3000;

function makeCard(value, suit, nv, index) {
    return { value, suit, numeric_val: nv, index };
}

describe('hand_sizes in socket events', () => {
    let gameID, player0, player1, connectClient, closeServer;

    beforeEach(async () => {
        ({ gameID, player0, player1, connectClient, closeServer } = await createTestServer());
        games[gameID].game_state.current_turn = 0;
    });

    afterEach(async () => {
        await closeServer();
    });

    test('start event includes hand_sizes with correct counts for all players', done => {
        Promise.all([connectClient(player0), connectClient(player1)]).then(([c0, c1]) => {
            c0.once('start', ({ hand_sizes }) => {
                try {
                    expect(hand_sizes).toBeDefined();
                    expect(typeof hand_sizes[0]).toBe('number');
                    expect(typeof hand_sizes[1]).toBe('number');
                    expect(hand_sizes[0]).toBeGreaterThan(0);
                    expect(hand_sizes[1]).toBeGreaterThan(0);
                    c0.disconnect(); c1.disconnect();
                    done();
                } catch (err) { done(err); }
            });
            c0.emit('startGame');
        });
    }, TIMEOUT);

    test('turn event after cardFromDeck includes hand_sizes with correct counts', done => {
        connectClient(player0).then(client => {
            const p0Before = games[gameID].players[0].hand.length;
            const p1Before = games[gameID].players[1].hand.length;

            client.once('turn', ({ hand_sizes }) => {
                try {
                    expect(hand_sizes).toBeDefined();
                    // player0 discarded 1 and drew 1 → same count
                    expect(hand_sizes[0]).toBe(p0Before);
                    // player1 untouched
                    expect(hand_sizes[1]).toBe(p1Before);
                    client.disconnect();
                    done();
                } catch (err) { done(err); }
            });

            client.emit('makeTurn', gameID, { type: 'cardFromDeck', selected_cards: [0] });
        });
    }, TIMEOUT);

    test('turn event after cardFromTop includes hand_sizes with correct counts', done => {
        connectClient(player0).then(client => {
            const p0Before = games[gameID].players[0].hand.length;
            const p1Before = games[gameID].players[1].hand.length;

            client.once('turn', ({ hand_sizes }) => {
                try {
                    expect(hand_sizes).toBeDefined();
                    expect(hand_sizes[0]).toBe(p0Before);
                    expect(hand_sizes[1]).toBe(p1Before);
                    client.disconnect();
                    done();
                } catch (err) { done(err); }
            });

            client.emit('makeTurn', gameID, { type: 'cardFromTop', side: 'end', selected_cards: [0] });
        });
    }, TIMEOUT);

    test('hand_sizes reflects net change after discarding 2 cards and drawing 1', done => {
        games[gameID].players[0].hand = [
            makeCard('2', 'H', 2, 0),
            makeCard('2', 'C', 2, 1),
            makeCard('5', 'S', 5, 2),
        ];
        games[gameID].players[0].sum = 9;

        connectClient(player0).then(client => {
            client.once('turn', ({ hand_sizes }) => {
                try {
                    // 3 cards − 2 discarded + 1 drawn = 2
                    expect(hand_sizes[0]).toBe(2);
                    client.disconnect();
                    done();
                } catch (err) { done(err); }
            });

            client.emit('makeTurn', gameID, { type: 'cardFromDeck', selected_cards: [0, 1] });
        });
    }, TIMEOUT);

    test('nextRound event includes hand_sizes after a round ends', done => {
        games[gameID].players[0].score = 0;
        games[gameID].players[1].score = 0;
        games[gameID].players[0].hand = [makeCard('1', 'H', 1, 0)];
        games[gameID].players[0].sum = 1;
        games[gameID].players[1].hand = [makeCard('5', 'H', 5, 0)];
        games[gameID].players[1].sum = 5;

        Promise.all([connectClient(player0), connectClient(player1)]).then(([c0, c1]) => {
            c0.once('nextRound', ({ hand_sizes }) => {
                try {
                    expect(hand_sizes).toBeDefined();
                    expect(typeof hand_sizes[0]).toBe('number');
                    expect(typeof hand_sizes[1]).toBe('number');
                    c0.disconnect(); c1.disconnect();
                    done();
                } catch (err) { done(err); }
            });

            c0.emit('makeTurn', gameID, { type: 'yaniv', selected_cards: [] });
        });
    }, TIMEOUT);
});
