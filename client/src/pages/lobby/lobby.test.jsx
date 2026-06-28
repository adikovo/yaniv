import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Lobby } from './index';
import socket from '../../api/socket';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock('../../api/socket', () => ({
    default: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}));

const mockContext = {
    player: { id: 'p1', name: 'Alice', playerType: 'host' },
    players: [{ id: 'p1', name: 'Alice' }],
    gameID: 'ROOM42',
    gameStarted: false,
};

vi.mock('../../context/game-context', () => ({
    useGameContext: () => mockContext,
}));

// jsdom has no navigator.clipboard — provide a spy.
const writeText = vi.fn().mockResolvedValue(undefined);
beforeEach(() => {
    writeText.mockClear();
    mockNavigate.mockClear();
    socket.emit.mockClear();
    Object.assign(navigator, { clipboard: { writeText } });
    // restore default context before each test
    mockContext.player = { id: 'p1', name: 'Alice', playerType: 'host' };
    mockContext.players = [{ id: 'p1', name: 'Alice' }];
    mockContext.gameID = 'ROOM42';
    mockContext.gameStarted = false;
});

// ── Tests (T015, US2 — copy Game ID + Leave Lobby) ───────────────────────────

describe('Lobby — copy Game ID + Leave Lobby controls', () => {
    it('copy-Game-ID button writes the game id to the clipboard', async () => {
        render(<Lobby />);

        fireEvent.click(screen.getByRole('button', { name: /copy game id/i }));

        await waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ROOM42');
        });
    });

    it('Leave Lobby emits leaveRoom and navigates home', () => {
        render(<Lobby />);

        fireEvent.click(screen.getByRole('button', { name: /leave lobby/i }));

        expect(socket.emit).toHaveBeenCalledWith('leaveRoom');
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });
});

// ── Start Game guard ─────────────────────────────────────────────────────────

describe('Lobby — Start Game minimum-player guard', () => {
    it('Start Game button is disabled when only 1 player is in the lobby', () => {
        // mockContext.players already has 1 entry from beforeEach
        render(<Lobby />);

        expect(screen.getByRole('button', { name: /start game/i })).toBeDisabled();
    });

    it('Start Game button is enabled when 2 or more players are in the lobby', () => {
        mockContext.players = [
            { id: 'p1', name: 'Alice' },
            { id: 'p2', name: 'Bob' },
        ];
        render(<Lobby />);

        expect(screen.getByRole('button', { name: /start game/i })).not.toBeDisabled();
    });
});
