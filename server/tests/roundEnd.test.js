const { createTestServer } = require('./helpers/setup');
const { games } = require('../globals');

const TIMEOUT = 3000;

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

describe('Round End — yanivCall & roundEnd event', () => {
    let server, gameID, player0, player1, connectClient, closeServer;

    beforeEach(async () => {
        ({ gameID, player0, player1, connectClient, closeServer } = await createTestServer());
        // Ensure players have score
        games[gameID].players[0].score = 0;
        games[gameID].players[1].score = 0;
        // Fix turn to player 0
        games[gameID].game_state.current_turn = 0;
    });

    afterEach(async () => {
        await closeServer();
    });

    // T-A: Normal Yaniv win — caller has lower sum
    test('T-A: normal Yaniv win — winner is caller, asaf false, opponent score updated', done => {
        setHand(games[gameID].players[0], [makeCard('1', 'H', 1), makeCard('2', 'H', 2)]); // sum=3
        setHand(games[gameID].players[1], [makeCard('5', 'H', 5), makeCard('6', 'H', 6)]); // sum=11

        Promise.all([connectClient(player0), connectClient(player1)]).then(([c0, c1]) => {
            let received = 0;
            function check({ winner, asaf, players }) {
                try {
                    expect(winner.id).toBe(0);
                    expect(asaf).toBe(false);
                    expect(players[1].score).toBe(11);
                    expect(players[0].score).toBe(0);
                    if (++received === 2) { c0.disconnect(); c1.disconnect(); done(); }
                } catch (err) { done(err); }
            }
            c0.once('roundEnd', check);
            c1.once('roundEnd', check);

            c0.emit('makeTurn', gameID, { type: 'yaniv', selected_cards: [] });
        });
    }, TIMEOUT);

    // T-B: Asaf — caller has higher sum than opponent
    test('T-B: Asaf — caller penalised (sum+30), opponent adds their sum', done => {
        setHand(games[gameID].players[0], [makeCard('5', 'H', 5)]); // sum=5 (caller)
        setHand(games[gameID].players[1], [makeCard('4', 'H', 4)]); // sum=4 (lower → Asaf)

        Promise.all([connectClient(player0), connectClient(player1)]).then(([c0, c1]) => {
            let received = 0;
            function check({ winner, asaf, asafCaller, players }) {
                try {
                    expect(asaf).toBe(true);
                    expect(asafCaller.id).toBe(0);
                    expect(winner.id).toBe(1);
                    expect(players[0].score).toBe(35); // 5+30
                    expect(players[1].score).toBe(4);
                    if (++received === 2) { c0.disconnect(); c1.disconnect(); done(); }
                } catch (err) { done(err); }
            }
            c0.once('roundEnd', check);
            c1.once('roundEnd', check);

            c0.emit('makeTurn', gameID, { type: 'yaniv', selected_cards: [] });
        });
    }, TIMEOUT);

    // T-C: Asaf — tied hand value triggers Asaf
    test('T-C: Asaf triggered when sums are equal', done => {
        setHand(games[gameID].players[0], [makeCard('4', 'H', 4)]); // sum=4
        setHand(games[gameID].players[1], [makeCard('4', 'S', 4)]); // sum=4 (equal → Asaf)

        Promise.all([connectClient(player0), connectClient(player1)]).then(([c0, c1]) => {
            let received = 0;
            function check({ asaf }) {
                try {
                    expect(asaf).toBe(true);
                    if (++received === 2) { c0.disconnect(); c1.disconnect(); done(); }
                } catch (err) { done(err); }
            }
            c0.once('roundEnd', check);
            c1.once('roundEnd', check);

            c0.emit('makeTurn', gameID, { type: 'yaniv', selected_cards: [] });
        });
    }, TIMEOUT);

    // T-D: Multiple Asaf candidates in 3-player game — lowest hand wins
    test('T-D: 3-player — multiple Asaf candidates, lowest hand wins, caller gets sum+30', done => {
        const player2 = { id: 2, name: 'Charlie', playerType: 'join', score: 0 };
        games[gameID].players[2] = player2;
        games[gameID].game_state.current_turn = 0;

        setHand(games[gameID].players[0], [makeCard('5', 'H', 5)]); // sum=5 caller
        setHand(games[gameID].players[1], [makeCard('3', 'H', 3)]); // sum=3
        setHand(games[gameID].players[2], [makeCard('2', 'H', 2)]); // sum=2 ← winner

        Promise.all([connectClient(player0), connectClient(player1), connectClient(player2)]).then(([c0, c1, c2]) => {
            let received = 0;
            function check({ winner, asaf, players }) {
                try {
                    expect(asaf).toBe(true);
                    expect(winner.id).toBe(2);
                    expect(players[0].score).toBe(35); // 5+30
                    expect(players[1].score).toBe(3);
                    expect(players[2].score).toBe(2);
                    if (++received === 3) { c0.disconnect(); c1.disconnect(); c2.disconnect(); done(); }
                } catch (err) { done(err); }
            }
            c0.once('roundEnd', check);
            c1.once('roundEnd', check);
            c2.once('roundEnd', check);

            c0.emit('makeTurn', gameID, { type: 'yaniv', selected_cards: [] });
        });
    }, TIMEOUT);

    // T-E: Asaf with caller sum = 0 — penalty is exactly 30
    test('T-E: Asaf with caller sum 0 — penalty is exactly 30', done => {
        setHand(games[gameID].players[0], []); // sum=0
        games[gameID].players[0].sum = 0;
        setHand(games[gameID].players[1], []); // sum=0 — tie triggers Asaf
        games[gameID].players[1].sum = 0;

        Promise.all([connectClient(player0), connectClient(player1)]).then(([c0, c1]) => {
            let received = 0;
            function check({ asaf, players }) {
                try {
                    expect(asaf).toBe(true);
                    expect(players[0].score).toBe(30); // 0+30
                    if (++received === 2) { c0.disconnect(); c1.disconnect(); done(); }
                } catch (err) { done(err); }
            }
            c0.once('roundEnd', check);
            c1.once('roundEnd', check);

            c0.emit('makeTurn', gameID, { type: 'yaniv', selected_cards: [] });
        });
    }, TIMEOUT);
});

describe('Elimination & Scoring', () => {
    let gameID, player0, player1, connectClient, closeServer;

    beforeEach(async () => {
        ({ gameID, player0, player1, connectClient, closeServer } = await createTestServer());
        games[gameID].players[0].score = 0;
        games[gameID].players[1].score = 0;
        games[gameID].game_state.current_turn = 0;
        // Give each player a valid Yaniv hand (sum ≤ 7) so yaniv call goes through
        setHand(games[gameID].players[0], [makeCard('1', 'H', 1)]);
        setHand(games[gameID].players[1], [makeCard('5', 'H', 5)]);
    });

    afterEach(async () => {
        await closeServer();
    });

    // T-F: score landing on 100 → resets to 50 (salvation), NOT eliminated
    test('T-F: score landing on 100 resets to 50 and player is NOT eliminated', done => {
        // player 1 has sum=5; set score to 95 so it lands on 100 after round
        games[gameID].players[1].score = 95;
        Promise.all([connectClient(player0), connectClient(player1)]).then(([c0, c1]) => {
            c0.once('roundEnd', ({ players }) => {
                try {
                    expect(games[gameID].players[1]).toBeDefined();
                    expect(players[1].score).toBe(50);
                    c0.disconnect(); c1.disconnect(); done();
                } catch (err) { done(err); }
            });
            c0.emit('makeTurn', gameID, { type: 'yaniv', selected_cards: [] });
        });
    }, TIMEOUT);

    // T-F2: score landing on 50 → resets to 0 (salvation)
    test('T-F2: score landing on 50 resets to 0', done => {
        // player 1 has sum=5; set score to 45 so it lands on 50
        games[gameID].players[1].score = 45;
        Promise.all([connectClient(player0), connectClient(player1)]).then(([c0, c1]) => {
            c0.once('roundEnd', ({ players }) => {
                try {
                    expect(players[1].score).toBe(0);
                    c0.disconnect(); c1.disconnect(); done();
                } catch (err) { done(err); }
            });
            c0.emit('makeTurn', gameID, { type: 'yaniv', selected_cards: [] });
        });
    }, TIMEOUT);

    // T-G: score over 100 — eliminated
    test('T-G: player with score over 100 is eliminated after round end', done => {
        games[gameID].players[1].score = 96; // +5 from hand = 101 → eliminated
        Promise.all([connectClient(player0), connectClient(player1)]).then(([c0, c1]) => {
            c0.once('roundEnd', () => {
                try {
                    expect(games[gameID].players[1]).toBeUndefined();
                    c0.disconnect(); c1.disconnect(); done();
                } catch (err) { done(err); }
            });
            c0.emit('makeTurn', gameID, { type: 'yaniv', selected_cards: [] });
        });
    }, TIMEOUT);

    // T-G2: eliminated player appears in roundEnd.eliminated with correct data
    test('T-G2: eliminated player appears in roundEnd.eliminated with id, name, score', done => {
        games[gameID].players[1].score = 96; // +5 from hand = 101 → eliminated
        Promise.all([connectClient(player0), connectClient(player1)]).then(([c0, c1]) => {
            c0.once('roundEnd', ({ eliminated }) => {
                try {
                    expect(eliminated).toHaveLength(1);
                    expect(eliminated[0].id).toBe(1);
                    expect(eliminated[0].name).toBe(player1.name);
                    expect(eliminated[0].score).toBe(101);
                    c0.disconnect(); c1.disconnect(); done();
                } catch (err) { done(err); }
            });
            c0.emit('makeTurn', gameID, { type: 'yaniv', selected_cards: [] });
        });
    }, TIMEOUT);

});
