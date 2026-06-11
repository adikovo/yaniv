import { renderHook, act } from '@testing-library/react';
import { useAsafSequence } from './use-asaf-sequence';

describe('useAsafSequence', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    it('returns false when yanivResult is null', () => {
        const { result } = renderHook(() => useAsafSequence(null));

        expect(result.current).toBe(false);
    });

    it('returns false when yanivResult.asaf is false', () => {
        const { result } = renderHook(() => useAsafSequence({ asaf: false, caller: 'Alice' }));

        expect(result.current).toBe(false);
    });

    it('returns false immediately when yanivResult.asaf is true (before 1500ms)', () => {
        const { result } = renderHook(() => useAsafSequence({ asaf: true, caller: 'Bob' }));

        expect(result.current).toBe(false);
    });

    it('flips to true after 1500ms when yanivResult.asaf is true', () => {
        const { result } = renderHook(() => useAsafSequence({ asaf: true, caller: 'Bob' }));

        expect(result.current).toBe(false);

        act(() => {
            vi.advanceTimersByTime(1500);
        });

        expect(result.current).toBe(true);
    });

    it('resets to false when yanivResult is updated to null after an asaf result', () => {
        let yanivResult = { asaf: true, caller: 'Carol' };
        const { result, rerender } = renderHook(() => useAsafSequence(yanivResult));

        act(() => {
            vi.advanceTimersByTime(1500);
        });

        expect(result.current).toBe(true);

        yanivResult = null;
        rerender();

        expect(result.current).toBe(false);
    });

    it('does not flip to true if yanivResult is cleared before the 1500ms timer fires', () => {
        let yanivResult = { asaf: true, caller: 'Dave' };
        const { result, rerender } = renderHook(() => useAsafSequence(yanivResult));

        expect(result.current).toBe(false);

        // Clear before the timer fires
        yanivResult = null;
        rerender();

        act(() => {
            vi.advanceTimersByTime(1500);
        });

        expect(result.current).toBe(false);
    });

    it('cleans up the timer on unmount without throwing', () => {
        const { unmount } = renderHook(() => useAsafSequence({ asaf: true, caller: 'Eve' }));

        // Unmount before the 1500ms timer fires
        unmount();

        // Advancing time should not cause a setState-after-unmount error
        expect(() => {
            act(() => {
                vi.advanceTimersByTime(1500);
            });
        }).not.toThrow();
    });
});
