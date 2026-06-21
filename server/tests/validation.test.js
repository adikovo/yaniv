const {
    validateJoinRoom,
    validateMakeTurn,
    validateChatMessage,
} = require('../validation');

// TDD red phase: ../validation does not exist yet. These tests are expected to
// fail with a module-not-found error until server/validation.js is implemented.
//
// Contract under test (see specs/013-security-hardening/data-model.md):
//   validateJoinRoom(payload)            -> { ok, value?, reason? }
//   validateMakeTurn(turn_data, handLen) -> { ok, reason? }
//   validateChatMessage(message)         -> { ok, value?, reason? }

describe('validateJoinRoom', () => {
    const validPayload = () => ({
        player: { id: 'p1', name: 'Alice' },
        room: 'room-123',
    });

    test('accepts a valid payload and returns the player + room', () => {
        const result = validateJoinRoom(validPayload());
        expect(result.ok).toBe(true);
        expect(result.value.player.name).toBe('Alice');
        expect(result.value.room).toBe('room-123');
    });

    test('trims surrounding whitespace from the name', () => {
        const result = validateJoinRoom({
            player: { id: 'p1', name: '   Bob   ' },
            room: 'room-1',
        });
        expect(result.ok).toBe(true);
        expect(result.value.player.name).toBe('Bob');
    });

    test('accepts a name at the 1-char lower bound', () => {
        const result = validateJoinRoom({
            player: { id: 'p1', name: 'A' },
            room: 'r',
        });
        expect(result.ok).toBe(true);
    });

    test('accepts a name at the 20-char upper bound (after trim)', () => {
        const name = 'a'.repeat(20);
        const result = validateJoinRoom({
            player: { id: 'p1', name: `  ${name}  ` },
            room: 'r',
        });
        expect(result.ok).toBe(true);
        expect(result.value.player.name).toBe(name);
    });

    test('allows markup characters in the name (neutralized at render, not here)', () => {
        const result = validateJoinRoom({
            player: { id: 'p1', name: '<b>Bob</b>' },
            room: 'r',
        });
        expect(result.ok).toBe(true);
        expect(result.value.player.name).toBe('<b>Bob</b>');
    });

    test('allows common punctuation in the name', () => {
        const result = validateJoinRoom({
            player: { id: 'p1', name: "O'Brien-7!" },
            room: 'r',
        });
        expect(result.ok).toBe(true);
    });

    // --- reject cases ---

    test('rejects a null payload', () => {
        const result = validateJoinRoom(null);
        expect(result.ok).toBe(false);
        expect(typeof result.reason).toBe('string');
    });

    test('rejects an undefined payload', () => {
        expect(validateJoinRoom(undefined).ok).toBe(false);
    });

    test('rejects a non-object payload (number)', () => {
        expect(validateJoinRoom(42).ok).toBe(false);
    });

    test('rejects a missing player object', () => {
        expect(validateJoinRoom({ room: 'r' }).ok).toBe(false);
    });

    test('rejects a null player', () => {
        expect(validateJoinRoom({ player: null, room: 'r' }).ok).toBe(false);
    });

    test('accepts a numeric player.id (server assigns numeric ids)', () => {
        expect(
            validateJoinRoom({ player: { id: 0, name: 'Alice' }, room: 'r' }).ok
        ).toBe(true);
    });

    test('rejects an invalid player.id (null / object / NaN)', () => {
        expect(validateJoinRoom({ player: { id: null, name: 'Alice' }, room: 'r' }).ok).toBe(false);
        expect(validateJoinRoom({ player: { id: {}, name: 'Alice' }, room: 'r' }).ok).toBe(false);
        expect(validateJoinRoom({ player: { id: NaN, name: 'Alice' }, room: 'r' }).ok).toBe(false);
    });

    test('rejects an empty player.id', () => {
        expect(
            validateJoinRoom({ player: { id: '', name: 'Alice' }, room: 'r' }).ok
        ).toBe(false);
    });

    test('rejects a non-string player.name', () => {
        expect(
            validateJoinRoom({ player: { id: 'p1', name: 123 }, room: 'r' }).ok
        ).toBe(false);
    });

    test('rejects an empty / whitespace-only name', () => {
        expect(
            validateJoinRoom({ player: { id: 'p1', name: '   ' }, room: 'r' }).ok
        ).toBe(false);
    });

    test('rejects a name longer than 20 chars after trimming', () => {
        expect(
            validateJoinRoom({
                player: { id: 'p1', name: 'a'.repeat(21) },
                room: 'r',
            }).ok
        ).toBe(false);
    });

    test('rejects a missing room', () => {
        expect(validateJoinRoom({ player: { id: 'p1', name: 'Alice' } }).ok).toBe(false);
    });

    test('rejects an empty room', () => {
        expect(
            validateJoinRoom({ player: { id: 'p1', name: 'Alice' }, room: '' }).ok
        ).toBe(false);
    });

    test('rejects a non-string room', () => {
        expect(
            validateJoinRoom({ player: { id: 'p1', name: 'Alice' }, room: 42 }).ok
        ).toBe(false);
    });

    test('rejects a room longer than 64 chars', () => {
        expect(
            validateJoinRoom({
                player: { id: 'p1', name: 'Alice' },
                room: 'r'.repeat(65),
            }).ok
        ).toBe(false);
    });

    // --- never throws ---

    test('never throws on malformed input', () => {
        expect(() => validateJoinRoom(null)).not.toThrow();
        expect(() => validateJoinRoom(undefined)).not.toThrow();
        expect(() => validateJoinRoom(42)).not.toThrow();
        expect(() => validateJoinRoom([])).not.toThrow();
        expect(() => validateJoinRoom('string')).not.toThrow();
        expect(() => validateJoinRoom({ player: [] })).not.toThrow();
    });
});

describe('validateMakeTurn', () => {
    const HAND = 5;

    test('accepts cardFromDeck with valid selected_cards', () => {
        const result = validateMakeTurn(
            { type: 'cardFromDeck', selected_cards: [0, 1] },
            HAND
        );
        expect(result.ok).toBe(true);
    });

    test('accepts cardFromHand with valid selected_cards', () => {
        expect(
            validateMakeTurn({ type: 'cardFromHand', selected_cards: [4] }, HAND).ok
        ).toBe(true);
    });

    test('accepts cardFromTop with side "start"', () => {
        expect(
            validateMakeTurn(
                { type: 'cardFromTop', side: 'start', selected_cards: [0] },
                HAND
            ).ok
        ).toBe(true);
    });

    test('accepts cardFromTop with side "end"', () => {
        expect(
            validateMakeTurn(
                { type: 'cardFromTop', side: 'end', selected_cards: [0] },
                HAND
            ).ok
        ).toBe(true);
    });

    test('accepts yaniv with no selected_cards', () => {
        expect(validateMakeTurn({ type: 'yaniv' }, HAND).ok).toBe(true);
    });

    test('accepts an empty selected_cards array (handler enforces discard rules)', () => {
        expect(
            validateMakeTurn({ type: 'cardFromDeck', selected_cards: [] }, HAND).ok
        ).toBe(true);
    });

    test('rejects an index equal to handLength (off-by-one boundary)', () => {
        expect(
            validateMakeTurn({ type: 'cardFromDeck', selected_cards: [HAND] }, HAND).ok
        ).toBe(false);
    });

    // --- reject cases ---

    test('rejects a null turn_data', () => {
        const result = validateMakeTurn(null, HAND);
        expect(result.ok).toBe(false);
        expect(typeof result.reason).toBe('string');
    });

    test('rejects an undefined turn_data', () => {
        expect(validateMakeTurn(undefined, HAND).ok).toBe(false);
    });

    test('rejects a string turn_data', () => {
        expect(validateMakeTurn('cardFromDeck', HAND).ok).toBe(false);
    });

    test('rejects a number turn_data', () => {
        expect(validateMakeTurn(7, HAND).ok).toBe(false);
    });

    test('rejects an unknown type', () => {
        expect(validateMakeTurn({ type: 'teleport' }, HAND).ok).toBe(false);
    });

    test('rejects a missing type', () => {
        expect(validateMakeTurn({ selected_cards: [0] }, HAND).ok).toBe(false);
    });

    test('rejects selected_cards that is not an array', () => {
        expect(
            validateMakeTurn({ type: 'cardFromDeck', selected_cards: 'a' }, HAND).ok
        ).toBe(false);
    });

    test('rejects negative indices', () => {
        expect(
            validateMakeTurn({ type: 'cardFromDeck', selected_cards: [-1] }, HAND).ok
        ).toBe(false);
    });

    test('rejects non-integer indices', () => {
        expect(
            validateMakeTurn({ type: 'cardFromDeck', selected_cards: [1.5] }, HAND).ok
        ).toBe(false);
    });

    test('rejects non-number indices', () => {
        expect(
            validateMakeTurn({ type: 'cardFromDeck', selected_cards: ['a'] }, HAND).ok
        ).toBe(false);
    });

    test('rejects out-of-range indices (>= handLength)', () => {
        expect(
            validateMakeTurn({ type: 'cardFromDeck', selected_cards: [99] }, HAND).ok
        ).toBe(false);
    });

    test('rejects duplicate indices', () => {
        expect(
            validateMakeTurn({ type: 'cardFromDeck', selected_cards: [1, 1] }, HAND).ok
        ).toBe(false);
    });

    test('rejects cardFromTop with an invalid side', () => {
        expect(
            validateMakeTurn(
                { type: 'cardFromTop', side: 'middle', selected_cards: [0] },
                HAND
            ).ok
        ).toBe(false);
    });

    test('rejects cardFromTop with a missing side', () => {
        expect(
            validateMakeTurn({ type: 'cardFromTop', selected_cards: [0] }, HAND).ok
        ).toBe(false);
    });

    // --- never throws ---

    test('never throws on malformed input', () => {
        expect(() => validateMakeTurn(null, HAND)).not.toThrow();
        expect(() => validateMakeTurn(undefined, HAND)).not.toThrow();
        expect(() => validateMakeTurn('x', HAND)).not.toThrow();
        expect(() => validateMakeTurn(5, HAND)).not.toThrow();
        expect(() => validateMakeTurn([], HAND)).not.toThrow();
        expect(() =>
            validateMakeTurn({ type: 'cardFromDeck', selected_cards: null }, HAND)
        ).not.toThrow();
        // Confirms it returns a rejection rather than throwing.
        expect(validateMakeTurn(null, HAND).ok).toBe(false);
    });
});

describe('validateChatMessage', () => {
    test('accepts a normal string message and echoes it as value', () => {
        const result = validateChatMessage('hello world');
        expect(result.ok).toBe(true);
        expect(result.value).toBe('hello world');
    });

    test('accepts an empty string', () => {
        expect(validateChatMessage('').ok).toBe(true);
    });

    test('accepts a message at the 500-char upper bound', () => {
        expect(validateChatMessage('a'.repeat(500)).ok).toBe(true);
    });

    // --- reject cases ---

    test('rejects a message longer than 500 chars', () => {
        const result = validateChatMessage('a'.repeat(501));
        expect(result.ok).toBe(false);
        expect(typeof result.reason).toBe('string');
    });

    test('rejects a non-string (object)', () => {
        expect(validateChatMessage({ text: 'hi' }).ok).toBe(false);
    });

    test('rejects a non-string (number)', () => {
        expect(validateChatMessage(42).ok).toBe(false);
    });

    test('rejects null', () => {
        expect(validateChatMessage(null).ok).toBe(false);
    });

    test('rejects undefined', () => {
        expect(validateChatMessage(undefined).ok).toBe(false);
    });

    // --- never throws ---

    test('never throws on malformed input', () => {
        expect(() => validateChatMessage(null)).not.toThrow();
        expect(() => validateChatMessage(undefined)).not.toThrow();
        expect(() => validateChatMessage(42)).not.toThrow();
        expect(() => validateChatMessage({})).not.toThrow();
    });
});
