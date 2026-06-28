import { renderHook, act } from '@testing-library/react';
// T013a — testing a NOT-YET-CREATED hook. Importing it should fail until built.
import { useEliminations } from './use-eliminations';

// Normalize greyedIds / leavingIds to a plain array of ids, whether the hook
// returns arrays or Sets, so assertions are robust to either choice.
const toIds = (value) => {
    if (value == null) return [];
    return Array.isArray(value) ? [...value] : [...value];
};

describe('useEliminations (T013a)', () => {
    const GREY_MS = 1000;
    const FADE_MS = 400;

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    const setup = (overrides = {}) => {
        const onRemoveOpponents = vi.fn();
        const onLocalEliminated = vi.fn();
        const hook = renderHook(() =>
            useEliminations({
                localId: 'p1',
                onRemoveOpponents,
                onLocalEliminated,
                greyMs: GREY_MS,
                fadeMs: FADE_MS,
                ...overrides,
            })
        );
        return { ...hook, onRemoveOpponents, onLocalEliminated };
    };

    it('greys opponents immediately without fading or removing them', () => {
        const { result, onRemoveOpponents } = setup();

        act(() => {
            result.current.eliminate([{ id: 'p2' }, { id: 'p3' }]);
        });

        const greyed = toIds(result.current.greyedIds);
        expect(greyed).toContain('p2');
        expect(greyed).toContain('p3');
        expect(toIds(result.current.leavingIds)).toEqual([]);
        expect(onRemoveOpponents).not.toHaveBeenCalled();
    });

    it('starts the fade after greyMs without removing opponents yet', () => {
        const { result, onRemoveOpponents } = setup();

        act(() => {
            result.current.eliminate([{ id: 'p2' }, { id: 'p3' }]);
        });

        act(() => {
            vi.advanceTimersByTime(GREY_MS);
        });

        const leaving = toIds(result.current.leavingIds);
        expect(leaving).toContain('p2');
        expect(leaving).toContain('p3');
        expect(onRemoveOpponents).not.toHaveBeenCalled();
    });

    it('removes opponents once after greyMs + fadeMs and clears tracking state', () => {
        const { result, onRemoveOpponents } = setup();

        act(() => {
            result.current.eliminate([{ id: 'p2' }, { id: 'p3' }]);
        });

        act(() => {
            vi.advanceTimersByTime(GREY_MS);
        });
        act(() => {
            vi.advanceTimersByTime(FADE_MS);
        });

        expect(onRemoveOpponents).toHaveBeenCalledTimes(1);
        const removed = [...onRemoveOpponents.mock.calls[0][0]].sort();
        expect(removed).toEqual(['p2', 'p3']);

        expect(toIds(result.current.greyedIds)).not.toContain('p2');
        expect(toIds(result.current.greyedIds)).not.toContain('p3');
        expect(toIds(result.current.leavingIds)).not.toContain('p2');
        expect(toIds(result.current.leavingIds)).not.toContain('p3');
    });

    it('local player: greys, fades, then calls onLocalEliminated (never onRemoveOpponents with local id)', () => {
        const { result, onRemoveOpponents, onLocalEliminated } = setup();

        act(() => {
            result.current.eliminate([{ id: 'p1' }]);
        });
        expect(toIds(result.current.greyedIds)).toContain('p1');

        act(() => {
            vi.advanceTimersByTime(GREY_MS);
        });
        expect(toIds(result.current.leavingIds)).toContain('p1');

        act(() => {
            vi.advanceTimersByTime(FADE_MS);
        });

        expect(onLocalEliminated).toHaveBeenCalledTimes(1);

        // The local id must never be sent to onRemoveOpponents.
        onRemoveOpponents.mock.calls.forEach((call) => {
            expect([...(call[0] ?? [])]).not.toContain('p1');
        });
    });

    it('mixed: excludes local id from onRemoveOpponents and still fires onLocalEliminated once', () => {
        const { result, onRemoveOpponents, onLocalEliminated } = setup();

        act(() => {
            result.current.eliminate([{ id: 'p1' }, { id: 'p2' }]);
        });

        act(() => {
            vi.advanceTimersByTime(GREY_MS);
        });
        act(() => {
            vi.advanceTimersByTime(FADE_MS);
        });

        expect(onRemoveOpponents).toHaveBeenCalledTimes(1);
        const removed = [...onRemoveOpponents.mock.calls[0][0]].sort();
        expect(removed).toEqual(['p2']);

        expect(onLocalEliminated).toHaveBeenCalledTimes(1);
    });
});
