const { getNextPlayerId, nextTurn } = require('../gameLogic');

function makeGame(playerIds, currentTurn) {
    const players = {};
    for (const id of playerIds) {
        players[id] = { id, name: `Player${id}` };
    }
    return { players, game_state: { current_turn: currentTurn } };
}

describe('getNextPlayerId', () => {
    test('advances correctly with contiguous IDs 0,1,2', () => {
        expect(getNextPlayerId(makeGame([0, 1, 2], 0))).toBe(1);
        expect(getNextPlayerId(makeGame([0, 1, 2], 1))).toBe(2);
        expect(getNextPlayerId(makeGame([0, 1, 2], 2))).toBe(0);
    });

    test('skips missing middle player — IDs {0,2}', () => {
        expect(getNextPlayerId(makeGame([0, 2], 0))).toBe(2);
        expect(getNextPlayerId(makeGame([0, 2], 2))).toBe(0);
    });

    test('skips missing first player — IDs {1,2}', () => {
        expect(getNextPlayerId(makeGame([1, 2], 1))).toBe(2);
        expect(getNextPlayerId(makeGame([1, 2], 2))).toBe(1);
    });

    test('single player wraps to itself', () => {
        expect(getNextPlayerId(makeGame([0], 0))).toBe(0);
    });
});

describe('nextTurn', () => {
    test('updates current_turn to the next active player', () => {
        const game = makeGame([0, 1, 2], 1);
        nextTurn(game);
        expect(game.game_state.current_turn).toBe(2);
    });

    test('wraps around correctly with non-contiguous IDs', () => {
        const game = makeGame([0, 2], 0);
        nextTurn(game);
        expect(game.game_state.current_turn).toBe(2);
        nextTurn(game);
        expect(game.game_state.current_turn).toBe(0);
    });

    test('does not crash on empty player set', () => {
        const game = { players: {}, game_state: { current_turn: 0 } };
        expect(() => nextTurn(game)).not.toThrow();
        expect(game.game_state.current_turn).toBe(0);
    });
});
