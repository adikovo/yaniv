const { yanivCall } = require('./gameLogic');

function makeGame(players, currentTurn) {
    return {
        players,
        game_state: { current_turn: currentTurn },
    };
}

describe('yanivCall', () => {
    describe('Yaniv (normal win)', () => {
        test('caller is returned and equals the winner', () => {
            const game = makeGame(
                { 0: { id: 'p0', name: 'Alice', sum: 5, score: 0 },
                  1: { id: 'p1', name: 'Bob',   sum: 10, score: 0 } },
                0
            );
            const result = yanivCall(game);
            expect(result.asaf).toBe(false);
            expect(result.caller.id).toBe('p0');
            expect(result.winner.id).toBe('p0');
        });

        test('non-callers add their hand sum to score; caller score unchanged', () => {
            const game = makeGame(
                { 0: { id: 'p0', name: 'Alice', sum: 3, score: 10 },
                  1: { id: 'p1', name: 'Bob',   sum: 7, score: 20 } },
                0
            );
            yanivCall(game);
            expect(game.players[0].score).toBe(10); // caller unchanged
            expect(game.players[1].score).toBe(27); // 20 + 7
        });

        test('salvation: non-caller landing exactly on 100 drops to 50', () => {
            const game = makeGame(
                { 0: { id: 'p0', name: 'Alice', sum: 3, score: 10 },
                  1: { id: 'p1', name: 'Bob',   sum: 7, score: 93 } },
                0
            );
            yanivCall(game);
            expect(game.players[1].score).toBe(50);
        });

        test('salvation: non-caller landing exactly on 50 drops to 0', () => {
            const game = makeGame(
                { 0: { id: 'p0', name: 'Alice', sum: 3, score: 10 },
                  1: { id: 'p1', name: 'Bob',   sum: 7, score: 43 } },
                0
            );
            yanivCall(game);
            expect(game.players[1].score).toBe(0);
        });
    });

    describe('Asaf (caller countered)', () => {
        test('winner is the countering player; caller is the original caller', () => {
            const game = makeGame(
                { 0: { id: 'p0', name: 'Alice', sum: 5, score: 0 },
                  1: { id: 'p1', name: 'Bob',   sum: 3, score: 0 } },
                0
            );
            const result = yanivCall(game);
            expect(result.asaf).toBe(true);
            expect(result.caller.id).toBe('p0');
            expect(result.winner.id).toBe('p1');
        });

        test('equal sum (tie) also counts as asaf', () => {
            const game = makeGame(
                { 0: { id: 'p0', name: 'Alice', sum: 5, score: 0 },
                  1: { id: 'p1', name: 'Bob',   sum: 5, score: 0 } },
                0
            );
            const result = yanivCall(game);
            expect(result.asaf).toBe(true);
            expect(result.caller.id).toBe('p0');
        });

        test('caller gets sum+30 penalty; countering player adds their own sum', () => {
            const game = makeGame(
                { 0: { id: 'p0', name: 'Alice', sum: 5, score: 10 },
                  1: { id: 'p1', name: 'Bob',   sum: 3, score: 20 } },
                0
            );
            yanivCall(game);
            expect(game.players[0].score).toBe(45); // 10 + 5 + 30
            expect(game.players[1].score).toBe(23); // 20 + 3
        });

        test('salvation: caller landing exactly on 100 after penalty drops to 50', () => {
            // 65 + 5 + 30 = 100 → salvation → 50
            const game = makeGame(
                { 0: { id: 'p0', name: 'Alice', sum: 5, score: 65 },
                  1: { id: 'p1', name: 'Bob',   sum: 3, score: 0 } },
                0
            );
            yanivCall(game);
            expect(game.players[0].score).toBe(50);
        });
    });
});

describe('asafPlayers', () => {
    test('empty array when no asaf — all opponents have sum > caller', () => {
        const game = makeGame(
            { 0: { id: 'p0', name: 'Alice', sum: 4, score: 0 },
              1: { id: 'p1', name: 'Bob',   sum: 8, score: 0 },
              2: { id: 'p2', name: 'Carol', sum: 12, score: 0 } },
            0
        );
        const result = yanivCall(game);
        expect(result.asaf).toBe(false);
        expect(result.asafPlayers).toEqual([]);
    });

    test('single counter — one opponent with sum < caller returns that player', () => {
        const game = makeGame(
            { 0: { id: 'p0', name: 'Alice', sum: 7, score: 0 },
              1: { id: 'p1', name: 'Bob',   sum: 4, score: 0 },
              2: { id: 'p2', name: 'Carol', sum: 10, score: 0 } },
            0
        );
        const result = yanivCall(game);
        expect(result.asaf).toBe(true);
        expect(result.asafPlayers).toHaveLength(1);
        expect(result.asafPlayers[0].id).toBe('p1');
        expect(result.asafPlayers[0].name).toBe('Bob');
    });

    test('equal sum also counts as a counter — opponent with same sum appears in asafPlayers', () => {
        const game = makeGame(
            { 0: { id: 'p0', name: 'Alice', sum: 5, score: 0 },
              1: { id: 'p1', name: 'Bob',   sum: 5, score: 0 },
              2: { id: 'p2', name: 'Carol', sum: 9, score: 0 } },
            0
        );
        const result = yanivCall(game);
        expect(result.asaf).toBe(true);
        expect(result.asafPlayers).toHaveLength(1);
        expect(result.asafPlayers[0].id).toBe('p1');
    });

    test('multiple counters — all players with sum <= caller are included', () => {
        const game = makeGame(
            { 0: { id: 'p0', name: 'Alice', sum: 7, score: 0 },
              1: { id: 'p1', name: 'Bob',   sum: 3, score: 0 },
              2: { id: 'p2', name: 'Carol', sum: 6, score: 0 },
              3: { id: 'p3', name: 'Dave',  sum: 9, score: 0 } },
            0
        );
        const result = yanivCall(game);
        expect(result.asaf).toBe(true);
        expect(result.asafPlayers).toHaveLength(2);
        const ids = result.asafPlayers.map(p => p.id);
        expect(ids).toContain('p1');
        expect(ids).toContain('p2');
        expect(ids).not.toContain('p3');
    });

    test('asafPlayers objects contain exactly id and name — no extra player fields', () => {
        const game = makeGame(
            { 0: { id: 'p0', name: 'Alice', sum: 7, score: 10 },
              1: { id: 'p1', name: 'Bob',   sum: 2, score: 30 } },
            0
        );
        const result = yanivCall(game);
        expect(result.asaf).toBe(true);
        expect(result.asafPlayers).toHaveLength(1);
        const player = result.asafPlayers[0];
        expect(player).toEqual({ id: 'p1', name: 'Bob' });
    });
});
