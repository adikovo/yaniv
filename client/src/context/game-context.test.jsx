import { renderHook, act } from '@testing-library/react';
import { GameProvider, useGameContext } from './game-context';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../api/socket', () => ({
    default: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}));

import socket from '../api/socket';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns the most recently registered socket listener for the given event.
 * GameProvider registers listeners inside useEffect; after renderHook they
 * will already be in socket.on.mock.calls.
 */
const getListener = (event) => {
    const calls = socket.on.mock.calls.filter(([e]) => e === event);
    return calls[calls.length - 1]?.[1];
};

// ── Tests ──────────────────────────────────────────────────────────────────

describe('GameContext — resetGame and start-event clearing', () => {
    const wrapper = ({ children }) => <GameProvider>{children}</GameProvider>;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // T007a ──────────────────────────────────────────────────────────────────
    test('T007a — resetGame() resets all per-game fields to initial values', () => {
        const { result } = renderHook(() => useGameContext(), { wrapper });

        // Set several context values via their setters so we have something to reset
        act(() => {
            result.current.setPlayer({ id: 'p1', name: 'Alice' });
            result.current.setPlayers([{ id: 'p1' }, { id: 'p2' }]);
            result.current.setGameOverData({ winner: { id: 'p1', name: 'Alice' } });
            result.current.setIsSpectator(true);
            result.current.setSum(42);
            result.current.setSelectedCards([{ value: '5', suit: 'H' }]);
            result.current.setHandSizes({ p1: 5, p2: 4 });
            result.current.setOpponentScores({ p2: 10 });
        });

        // Verify pre-conditions so the test is meaningful
        expect(result.current.player).toEqual({ id: 'p1', name: 'Alice' });
        expect(result.current.gameOverData).not.toBeNull();

        act(() => {
            result.current.resetGame();
        });

        expect(result.current.player).toEqual({});
        expect(result.current.players).toEqual([]);
        expect(result.current.gameOverData).toBeNull();
        expect(result.current.isSpectator).toBe(false);
        expect(result.current.sum).toBe(0);
        expect(result.current.selectedCards).toEqual([]);
        expect(result.current.handSizes).toEqual({});
        expect(result.current.opponentScores).toEqual({});
    });

    // T007b ──────────────────────────────────────────────────────────────────
    test('T007b — a `start` socket event clears gameOverData even when Game page is not mounted', () => {
        const { result } = renderHook(() => useGameContext(), { wrapper });

        // Simulate stale overlay from a previous round
        act(() => {
            result.current.setGameOverData({ winner: { id: 'p1', name: 'Alice' } });
        });

        expect(result.current.gameOverData).not.toBeNull();

        // Grab the handler that GameProvider registered for the "start" event
        const handleStart = getListener('start');
        expect(handleStart).toBeDefined();

        // Fire the start event — this is what the server sends at the top of a new round
        act(() => {
            handleStart({
                deck: [],
                top_card: [],
                current_turn: 'p1',
                hand_sizes: {},
            });
        });

        // The current implementation does NOT call setGameOverData(null) inside
        // handleStart, so this assertion FAILS — that is the intended red state.
        expect(result.current.gameOverData).toBeNull();
    });
});
