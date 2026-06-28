import { render, screen, act, fireEvent } from '@testing-library/react';
import { Game } from './index';
import socket from '../../api/socket';

// ── Mocks ──────────────────────────────────────────────────────────────────

// Record the socket handlers the Game registers in its useEffect so tests can
// drive them directly (e.g. fire `roundEnd` with eliminated players).
// `vi.hoisted` runs before the (hoisted) `vi.mock` factory, so the factory can
// safely close over `socketHandlers`.
const { socketHandlers, navigateMock } = vi.hoisted(() => ({
    socketHandlers: {},
    navigateMock: vi.fn(),
}));

vi.mock('../../api/socket', () => ({
    default: {
        on: (event, cb) => { socketHandlers[event] = cb; },
        off: vi.fn(),
        emit: vi.fn(),
    },
}));

vi.mock('react-router-dom', () => ({
    useNavigate: () => navigateMock,
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

// ── Elimination → spectator-prompt overlay decision ──────────────────────────
//
// Drives the `roundEnd` → useEliminations → overlay flow. The hook greys
// immediately, fades after greyMs (1000ms), then after fadeMs (400ms) removes
// opponents (setPlayers) and/or calls onLocalEliminated for the local player.
// onLocalEliminated does setShowSpectatorPrompt(true) which renders
// <SpectatorPrompt> ("You've been eliminated"). We advance ~1400ms to land
// past both timers.

const PROMPT_TEXT = "You've been eliminated";

// Total time to advance to clear the grey (1000) + fade (400) timers.
const ELIM_MS = 1400;

/**
 * Fire the recorded `roundEnd` handler with a list of eliminated records, then
 * advance fake timers past both elimination timers — all inside act() so React
 * flushes the resulting state updates / re-render.
 */
function fireRoundEndAndSettle(eliminated) {
    act(() => {
        socketHandlers.roundEnd?.({
            yanivCaller: { id: 'p1' },
            asaf: false,
            eliminated,
        });
    });
    act(() => {
        vi.advanceTimersByTime(ELIM_MS);
    });
}

describe('Game page — elimination → spectator-prompt overlay decision', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Reset recorded handlers between tests so a stale handler can't leak.
        for (const k of Object.keys(socketHandlers)) delete socketHandlers[k];

        mockContext.player = { id: 'p1', name: 'Alice', hand: [] };
        mockContext.players = [
            { id: 'p1', name: 'Alice' },
            { id: 'p2', name: 'Bob' },
            { id: 'p3', name: 'Carol' },
        ];
        mockContext.gameState = { current_turn: 'p2', top_card: [], deck: [] };
        mockContext.handSizes = { p1: 5, p2: 4, p3: 3 };
        mockContext.opponentScores = { p1: 0, p2: 10, p3: 5 };
        mockContext.gameOverData = null;
        mockContext.isSpectator = false;
        mockContext.setPlayers = vi.fn();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // ── Sanity: handlers are actually captured ───────────────────────────────
    test('registers a roundEnd socket handler on mount', () => {
        render(<Game />);
        expect(typeof socketHandlers.roundEnd).toBe('function');
    });

    // ── Scenario 1 (RED now — T025a) ─────────────────────────────────────────
    // 2-player game, local player eliminated → only 1 remains → game-over, so
    // the spectator prompt must NOT appear. Currently it wrongly does.
    test('2-player game, local eliminated → NO spectator prompt (game-over, not spectatable)', () => {
        mockContext.players = [
            { id: 'p1', name: 'Alice' },
            { id: 'p2', name: 'Bob' },
        ];
        mockContext.handSizes = { p1: 5, p2: 4 };
        mockContext.opponentScores = { p1: 0, p2: 10 };

        render(<Game />);
        fireRoundEndAndSettle([{ id: 'p1', name: 'Alice', score: 105 }]);

        expect(screen.queryByText(PROMPT_TEXT)).not.toBeInTheDocument();
    });

    // ── Scenario 2 (GREEN now — guard against over-suppression) ──────────────
    // 3-player game, local eliminated → 2 remain → game continues → prompt SHOWS.
    test('3-player game, local eliminated, 2 remain → spectator prompt SHOWS', () => {
        render(<Game />);
        fireRoundEndAndSettle([{ id: 'p1', name: 'Alice', score: 110 }]);

        expect(screen.getByText(PROMPT_TEXT)).toBeInTheDocument();
    });

    // ── Scenario 3 (GREEN now) ───────────────────────────────────────────────
    // 3-player game, an OPPONENT eliminated (not local) → no prompt; the
    // opponent is removed via setPlayers.
    test('3-player game, opponent eliminated → NO prompt, and opponent removed via setPlayers', () => {
        render(<Game />);
        fireRoundEndAndSettle([{ id: 'p2', name: 'Bob', score: 120 }]);

        expect(screen.queryByText(PROMPT_TEXT)).not.toBeInTheDocument();
        // The hook removes opponents via onRemoveOpponents → setPlayers(updater).
        expect(mockContext.setPlayers).toHaveBeenCalled();
        // It is called with a functional updater; assert it removes p2.
        const updater = mockContext.setPlayers.mock.calls.at(-1)[0];
        expect(typeof updater).toBe('function');
        const remaining = updater(mockContext.players).map(p => p.id);
        expect(remaining).not.toContain('p2');
        expect(remaining).toEqual(expect.arrayContaining(['p1', 'p3']));
    });

    // ── Scenario 4 (RED now — same root cause as #1) ─────────────────────────
    // 3-player game, local + one opponent eliminated together → only 1 remains
    // → game-over → NO prompt.
    test('3-player game, local + opponent eliminated together, 1 remains → NO prompt (game-over)', () => {
        render(<Game />);
        fireRoundEndAndSettle([
            { id: 'p1', name: 'Alice', score: 130 },
            { id: 'p2', name: 'Bob', score: 125 },
        ]);

        expect(screen.queryByText(PROMPT_TEXT)).not.toBeInTheDocument();
    });

    // ── Extra edge case A (GREEN now) ────────────────────────────────────────
    // 4-player game, local eliminated → 3 remain → game continues → prompt SHOWS.
    // Guards the boundary above the >=2 threshold.
    test('4-player game, local eliminated, 3 remain → spectator prompt SHOWS', () => {
        mockContext.players = [
            { id: 'p1', name: 'Alice' },
            { id: 'p2', name: 'Bob' },
            { id: 'p3', name: 'Carol' },
            { id: 'p4', name: 'Dave' },
        ];
        mockContext.handSizes = { p1: 5, p2: 4, p3: 3, p4: 2 };
        mockContext.opponentScores = { p1: 0, p2: 10, p3: 5, p4: 7 };

        render(<Game />);
        fireRoundEndAndSettle([{ id: 'p1', name: 'Alice', score: 140 }]);

        expect(screen.getByText(PROMPT_TEXT)).toBeInTheDocument();
    });

    // ── Extra edge case B (RED now — same root cause as #1) ───────────────────
    // 4-player game, local + two opponents eliminated together → only 1 remains
    // → game-over → NO prompt. Exercises the threshold from a higher player count.
    test('4-player game, local + 2 opponents eliminated, 1 remains → NO prompt (game-over)', () => {
        mockContext.players = [
            { id: 'p1', name: 'Alice' },
            { id: 'p2', name: 'Bob' },
            { id: 'p3', name: 'Carol' },
            { id: 'p4', name: 'Dave' },
        ];
        mockContext.handSizes = { p1: 5, p2: 4, p3: 3, p4: 2 };
        mockContext.opponentScores = { p1: 0, p2: 10, p3: 5, p4: 7 };

        render(<Game />);
        fireRoundEndAndSettle([
            { id: 'p1', name: 'Alice', score: 150 },
            { id: 'p2', name: 'Bob', score: 145 },
            { id: 'p3', name: 'Carol', score: 142 },
        ]);

        expect(screen.queryByText(PROMPT_TEXT)).not.toBeInTheDocument();
    });

    // ── Extra edge case C (GREEN now — prompt timing) ────────────────────────
    // The prompt must NOT appear before the grey+fade timers elapse. Fire the
    // round-end but only advance partway (past grey, before fade completes).
    test('prompt does NOT appear before the grey+fade sequence completes', () => {
        render(<Game />);
        act(() => {
            socketHandlers.roundEnd?.({
                yanivCaller: { id: 'p1' },
                asaf: false,
                eliminated: [{ id: 'p1', name: 'Alice', score: 110 }],
            });
        });
        // Advance only through the grey beat (1000ms), not the fade (400ms).
        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(screen.queryByText(PROMPT_TEXT)).not.toBeInTheDocument();

        // Now finish the fade — prompt should appear (3 players, 2 remain).
        act(() => {
            vi.advanceTimersByTime(400);
        });
        expect(screen.getByText(PROMPT_TEXT)).toBeInTheDocument();
    });

    // ── Extra edge case D (GREEN now — no eliminations) ──────────────────────
    // A roundEnd with no eliminated players must never open the prompt.
    test('roundEnd with empty eliminated list → NO prompt', () => {
        render(<Game />);
        fireRoundEndAndSettle([]);
        expect(screen.queryByText(PROMPT_TEXT)).not.toBeInTheDocument();
    });
});

// ── US4: Home button + leave-confirmation dialog ─────────────────────────────
//
// T025 adds a top-right Home corner button (aria-label "Leave game", a lucide
// Home icon) that opens the neon LeaveDialog ("Leave the game?"). Confirming
// ("Yes") emits `leaveRoom` and navigates home ('/'); declining ("No") just
// closes the dialog and leaves the game mounted. The control appears in BOTH
// the active game view and the spectator view, with identical behavior.

const LEAVE_DIALOG_HEADING = 'Leave the game?';

function setupActiveBoard() {
    mockContext.player = { id: 'p1', name: 'Alice', hand: [] };
    mockContext.players = [
        { id: 'p1', name: 'Alice' },
        { id: 'p2', name: 'Bob' },
    ];
    mockContext.gameState = { current_turn: 'p2', top_card: [], deck: [] };
    mockContext.handSizes = { p1: 5, p2: 4 };
    mockContext.opponentScores = { p1: 0, p2: 10 };
    mockContext.gameOverData = null;
    mockContext.isSpectator = false;
}

const getHomeButton = () => screen.getByRole('button', { name: /leave game/i });
const leaveRoomCalls = () => socket.emit.mock.calls.filter(([ev]) => ev === 'leaveRoom');

describe('Game page — US4: Home button + leave-confirmation dialog', () => {
    beforeEach(() => {
        setupActiveBoard();
        navigateMock.mockClear();
        socket.emit.mockClear();
    });

    // ── Active game view ─────────────────────────────────────────────────────
    test('renders a Home (leave game) control in the active game view', () => {
        render(<Game />);
        expect(getHomeButton()).toBeInTheDocument();
    });

    test('the leave dialog is NOT shown before the Home button is clicked', () => {
        render(<Game />);
        expect(screen.queryByText(LEAVE_DIALOG_HEADING)).not.toBeInTheDocument();
    });

    test('clicking Home opens the leave-confirmation dialog', () => {
        render(<Game />);
        fireEvent.click(getHomeButton());
        expect(screen.getByText(LEAVE_DIALOG_HEADING)).toBeInTheDocument();
    });

    test('opening the dialog alone does not emit leaveRoom or navigate', () => {
        render(<Game />);
        fireEvent.click(getHomeButton());
        expect(leaveRoomCalls()).toHaveLength(0);
        expect(navigateMock).not.toHaveBeenCalled();
    });

    test('"No" closes the dialog without leaving (no emit, no navigate, game stays mounted)', () => {
        render(<Game />);
        fireEvent.click(getHomeButton());
        fireEvent.click(screen.getByRole('button', { name: 'No' }));

        expect(screen.queryByText(LEAVE_DIALOG_HEADING)).not.toBeInTheDocument();
        expect(leaveRoomCalls()).toHaveLength(0);
        expect(navigateMock).not.toHaveBeenCalled();
        // The game board is still mounted (opponent still rendered).
        expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    test('"Yes" emits leaveRoom exactly once and navigates home exactly once', () => {
        render(<Game />);
        fireEvent.click(getHomeButton());
        fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

        expect(leaveRoomCalls()).toHaveLength(1);
        expect(navigateMock).toHaveBeenCalledTimes(1);
        expect(navigateMock).toHaveBeenCalledWith('/');
    });

    test('after "No", clicking Home again re-opens the dialog (no stale state)', () => {
        render(<Game />);
        fireEvent.click(getHomeButton());
        fireEvent.click(screen.getByRole('button', { name: 'No' }));
        expect(screen.queryByText(LEAVE_DIALOG_HEADING)).not.toBeInTheDocument();

        fireEvent.click(getHomeButton());
        expect(screen.getByText(LEAVE_DIALOG_HEADING)).toBeInTheDocument();
    });

    // ── Spectator view (same control, same behavior) ─────────────────────────
    test('renders the same Home (leave game) control in the spectator view', () => {
        mockContext.isSpectator = true;
        render(<Game />);
        expect(getHomeButton()).toBeInTheDocument();
    });

    test('spectator: clicking Home opens the leave dialog', () => {
        mockContext.isSpectator = true;
        render(<Game />);
        fireEvent.click(getHomeButton());
        expect(screen.getByText(LEAVE_DIALOG_HEADING)).toBeInTheDocument();
    });

    test('spectator: "Yes" emits leaveRoom once and navigates home once', () => {
        mockContext.isSpectator = true;
        render(<Game />);
        fireEvent.click(getHomeButton());
        fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

        expect(leaveRoomCalls()).toHaveLength(1);
        expect(navigateMock).toHaveBeenCalledTimes(1);
        expect(navigateMock).toHaveBeenCalledWith('/');
    });

    test('spectator: "No" closes the dialog without leaving', () => {
        mockContext.isSpectator = true;
        render(<Game />);
        fireEvent.click(getHomeButton());
        fireEvent.click(screen.getByRole('button', { name: 'No' }));

        expect(screen.queryByText(LEAVE_DIALOG_HEADING)).not.toBeInTheDocument();
        expect(leaveRoomCalls()).toHaveLength(0);
        expect(navigateMock).not.toHaveBeenCalled();
    });
});
