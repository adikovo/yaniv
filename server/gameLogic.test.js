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
