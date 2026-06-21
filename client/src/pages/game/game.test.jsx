import { render, screen } from '@testing-library/react';
import { Game } from './index';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../../api/socket', () => ({
    default: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}));

vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn(),
}));

const mockContext = {
    player: { id: 'p1', name: 'Alice', hand: [] },
    setPlayer: vi.fn(),
    players: [],
    setPlayers: vi.fn(),
    gameID: 'room1',
    gameState: { current_turn: 'p2', top_card: [], deck: [] },
    setGameState: vi.fn(),
    sum: 0,
    setSum: vi.fn(),
    selectedCards: [],
    setSelectedCards: vi.fn(),
    gameOverData: null,
    setGameOverData: vi.fn(),
    isSpectator: false,
    setIsSpectator: vi.fn(),
    handSizes: { p2: 4, p3: 3 },
    opponentScores: { p2: 10, p3: 5 },
};

vi.mock('../../context/game-context', () => ({
    useGameContext: () => mockContext,
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function setCurrentTurn(id) {
    mockContext.gameState = { ...mockContext.gameState, current_turn: id };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Game page — Phase 3: OpponentArea rendering', () => {
    beforeEach(() => {
        mockContext.players = [
            { id: 'p1', name: 'Alice' },
            { id: 'p2', name: 'Bob' },
        ];
        mockContext.player = { id: 'p1', name: 'Alice', hand: [] };
        mockContext.gameState = { current_turn: 'p2', top_card: [], deck: [] };
        mockContext.handSizes = { p1: 5, p2: 4 };
        mockContext.opponentScores = { p1: 0, p2: 10 };
    });

    test('renders face-down cards for the opponent', () => {
        render(<Game />);
        const imgs = screen.getAllByRole('img');
        const faceDownCards = imgs.filter(img => img.src.includes('back.png'));
        // Bob has 4 cards in hand
        expect(faceDownCards).toHaveLength(4);
    });

    test('does not render a face-down card area for the local player', () => {
        // Alice (local) has 5 cards but they should NOT appear as face-down
        render(<Game />);
        const imgs = screen.getAllByRole('img');
        const faceDownCards = imgs.filter(img => img.src.includes('back.png'));
        // Only Bob's 4 face-down cards, not Alice's
        expect(faceDownCards).toHaveLength(4);
    });

    test('renders the opponent name', () => {
        render(<Game />);
        expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    test('renders the opponent score', () => {
        render(<Game />);
        expect(screen.getByText('10')).toBeInTheDocument();
    });

    test('opponent area has active-turn class when it is their turn', () => {
        setCurrentTurn('p2');
        const { container } = render(<Game />);
        const activeArea = container.querySelector('.active-turn');
        expect(activeArea).toBeInTheDocument();
    });

    test('opponent area does not have active-turn class when it is not their turn', () => {
        setCurrentTurn('p1');
        const { container } = render(<Game />);
        const activeArea = container.querySelector('.opponent-area.active-turn');
        expect(activeArea).not.toBeInTheDocument();
    });

    test('in a 2-player game, opponent is assigned top position', () => {
        const { container } = render(<Game />);
        expect(container.querySelector('.opponent-top')).toBeInTheDocument();
    });

    test('in a 3-player game, opponents are assigned left and right positions', () => {
        mockContext.players = [
            { id: 'p1', name: 'Alice' },
            { id: 'p2', name: 'Bob' },
            { id: 'p3', name: 'Carol' },
        ];
        mockContext.handSizes = { p1: 5, p2: 4, p3: 3 };
        mockContext.opponentScores = { p1: 0, p2: 10, p3: 5 };

        const { container } = render(<Game />);
        expect(container.querySelector('.opponent-right')).toBeInTheDocument();
        expect(container.querySelector('.opponent-left')).toBeInTheDocument();
        expect(container.querySelector('.opponent-top')).not.toBeInTheDocument();
    });
});
