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

vi.mock('../../context/game-context', () => ({
    useGameContext: () => ({
        player: { id: 'p1', name: 'Alice', playerType: 'host' },
        players: [{ id: 'p1', name: 'Alice' }],
        gameID: 'ROOM42',
        gameStarted: false,
    }),
}));

// jsdom has no navigator.clipboard — provide a spy.
const writeText = vi.fn().mockResolvedValue(undefined);
beforeEach(() => {
    writeText.mockClear();
    mockNavigate.mockClear();
    socket.emit.mockClear();
    Object.assign(navigator, { clipboard: { writeText } });
});

// ── Tests (T015, US2 — copy Game ID + Leave Lobby) ───────────────────────────

describe('Lobby — copy Game ID + Leave Lobby controls', () => {
    it('copy-Game-ID button writes the game id to the clipboard', async () => {
        render(<Lobby />);

        // Copy control does not exist yet → this throws → red.
        fireEvent.click(screen.getByRole('button', { name: /copy game id/i }));

        await waitFor(() => {
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith('ROOM42');
        });
    });

    it('Leave Lobby emits leaveRoom and navigates home', () => {
        render(<Lobby />);

        // Leave Lobby control does not exist yet → this throws → red.
        fireEvent.click(screen.getByRole('button', { name: /leave lobby/i }));

        expect(socket.emit).toHaveBeenCalledWith('leaveRoom');
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });
});
