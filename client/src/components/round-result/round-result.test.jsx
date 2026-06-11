import { render, screen, fireEvent, act } from '@testing-library/react';
import { RoundResult } from './index';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../../api/socket', () => ({
    default: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}));
import socket from '../../api/socket';

const navigateSpy = vi.fn();
vi.mock('react-router-dom', () => ({
    useNavigate: () => navigateSpy,
}));

const resetGameSpy = vi.fn();
vi.mock('../../context/game-context', () => ({
    useGameContext: () => ({ resetGame: resetGameSpy }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

const winner = { name: 'Alice' };

function emitsOf(event) {
    return socket.emit.mock.calls.filter(([name]) => name === event);
}

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
    vi.useFakeTimers();
    navigateSpy.mockClear();
    resetGameSpy.mockClear();
    socket.emit.mockClear();
    socket.on.mockClear();
    socket.off.mockClear();
});

afterEach(() => {
    vi.useRealTimers();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('RoundResult — countdown expiry without clicking Rematch', () => {
    test('emits leaveRoom and navigates home, and does NOT emit rematchReady', () => {
        render(<RoundResult winner={winner} />);

        act(() => {
            vi.advanceTimersByTime(11000);
        });

        expect(emitsOf('leaveRoom')).toHaveLength(1);
        expect(navigateSpy).toHaveBeenCalledWith('/');
        expect(emitsOf('rematchReady')).toHaveLength(0);
    });
});

describe('RoundResult — clicking Rematch', () => {
    test('emits rematchReady and the button text becomes Waiting...', () => {
        render(<RoundResult winner={winner} />);

        const rematchBtn = screen.getByRole('button', { name: /Rematch/i });
        fireEvent.click(rematchBtn);

        expect(emitsOf('rematchReady')).toHaveLength(1);
        expect(screen.getByText('Waiting...')).toBeInTheDocument();
    });

    test('after clicking, countdown expiry does NOT emit leaveRoom or navigate', () => {
        render(<RoundResult winner={winner} />);

        const rematchBtn = screen.getByRole('button', { name: /Rematch/i });
        fireEvent.click(rematchBtn);

        act(() => {
            vi.advanceTimersByTime(11000);
        });

        expect(emitsOf('leaveRoom')).toHaveLength(0);
        expect(navigateSpy).not.toHaveBeenCalled();
    });
});

describe('RoundResult — Go Home button', () => {
    test('emits leaveRoom, calls resetGame, and navigates home', () => {
        render(<RoundResult winner={winner} />);

        const homeBtn = screen.getByRole('button', { name: /Go Home/i });
        fireEvent.click(homeBtn);

        expect(emitsOf('leaveRoom')).toHaveLength(1);
        expect(resetGameSpy).toHaveBeenCalledTimes(1);
        expect(navigateSpy).toHaveBeenCalledWith('/');
    });
});

describe('RoundResult — canRematch={false} (opponent left)', () => {
    test('does not render a Rematch button and shows the left-game text', () => {
        render(<RoundResult winner={winner} canRematch={false} />);

        expect(screen.queryByRole('button', { name: /Rematch/i })).not.toBeInTheDocument();
        expect(
            screen.getByText('All other players have left the game.')
        ).toBeInTheDocument();
    });

    test('Go Home still emits leaveRoom, calls resetGame, and navigates', () => {
        render(<RoundResult winner={winner} canRematch={false} />);

        const homeBtn = screen.getByRole('button', { name: /Go Home/i });
        fireEvent.click(homeBtn);

        expect(emitsOf('leaveRoom')).toHaveLength(1);
        expect(resetGameSpy).toHaveBeenCalledTimes(1);
        expect(navigateSpy).toHaveBeenCalledWith('/');
    });
});
