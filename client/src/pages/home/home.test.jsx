import { render, screen, fireEvent } from '@testing-library/react';
import { Home } from './index';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../../api/api', () => ({
    sendHost: vi.fn(),
    sendJoin: vi.fn(),
}));

vi.mock('../../api/socket', () => ({
    default: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}));

vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn(),
}));

vi.mock('../../context/game-context', () => ({
    useGameContext: () => ({
        setGameID: vi.fn(),
        gameID: '',
        setPlayer: vi.fn(),
        resetGame: vi.fn(),
    }),
}));

// ── Tests (T015, US2 — Back control) ─────────────────────────────────────────

describe('Home — Back control', () => {
    it('Back from the host form returns to the welcome screen', () => {
        render(<Home />);

        // Enter the host form from the welcome screen.
        fireEvent.click(screen.getByRole('button', { name: /host a game/i }));
        // The host form heading confirms we left the welcome screen.
        expect(screen.getByRole('heading', { name: 'Host a Game' })).toBeInTheDocument();

        // Back control does not exist yet → this throws → red.
        fireEvent.click(screen.getByRole('button', { name: /back/i }));

        // Welcome screen is back: the "Join a Game" button is the welcome signal
        // (the host form has no such button — only "Start game!!!").
        expect(
            screen.getByRole('button', { name: /join a game/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /host a game/i }),
        ).toBeInTheDocument();
    });

    it('Back from the join form returns to the welcome screen', () => {
        render(<Home />);

        // Enter the join form from the welcome screen.
        fireEvent.click(screen.getByRole('button', { name: /join a game/i }));
        // The join form heading confirms we left the welcome screen.
        expect(screen.getByRole('heading', { name: 'Join a Game' })).toBeInTheDocument();

        // Back control does not exist yet → this throws → red.
        fireEvent.click(screen.getByRole('button', { name: /back/i }));

        // Welcome screen is back.
        expect(
            screen.getByRole('button', { name: /join a game/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /host a game/i }),
        ).toBeInTheDocument();
    });
});
