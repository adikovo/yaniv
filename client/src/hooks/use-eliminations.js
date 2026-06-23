import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Orchestrates the eliminated-player sequence (feature 014, FR-010):
 *   grey (greyMs) → fade (leaving, fadeMs) → remove + reshuffle.
 *
 * Opponents are removed from `players` (via onRemoveOpponents) so the board
 * re-lays-out for the smaller count. The local player is never removed — when
 * they are eliminated we grey+fade their own area, then hand off to the
 * spectator prompt (via onLocalEliminated).
 *
 * @param {string}   localId            the local player's id
 * @param {Function} onRemoveOpponents  (idsArray) => void — remove eliminated opponents
 * @param {Function} onLocalEliminated  () => void — local player was eliminated
 * @param {number}   greyMs             grey beat before the fade starts
 * @param {number}   fadeMs             fade duration before removal
 */
export function useEliminations({
    localId,
    onRemoveOpponents,
    onLocalEliminated,
    greyMs = 1000,
    fadeMs = 400,
}) {
    const [greyedIds, setGreyedIds] = useState([]);
    const [leavingIds, setLeavingIds] = useState([]);
    const timers = useRef([]);

    const eliminate = useCallback((records) => {
        if (!records || records.length === 0) return;
        const ids = records.map((r) => r.id);

        // 1. grey immediately
        setGreyedIds((prev) => [...new Set([...prev, ...ids])]);

        // 2. start the fade after the grey beat
        const greyTimer = setTimeout(() => {
            setLeavingIds((prev) => [...new Set([...prev, ...ids])]);

            // 3. once the fade completes, remove opponents (reshuffle) and/or
            //    hand the local player to the spectator prompt
            const fadeTimer = setTimeout(() => {
                const opponentIds = ids.filter((id) => id !== localId);
                if (opponentIds.length > 0) onRemoveOpponents?.(opponentIds);
                if (ids.includes(localId)) onLocalEliminated?.();

                setGreyedIds((prev) => prev.filter((id) => !ids.includes(id)));
                setLeavingIds((prev) => prev.filter((id) => !ids.includes(id)));
            }, fadeMs);
            timers.current.push(fadeTimer);
        }, greyMs);
        timers.current.push(greyTimer);
    }, [localId, onRemoveOpponents, onLocalEliminated, greyMs, fadeMs]);

    // Clear any pending timers on unmount
    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    return { greyedIds, leavingIds, eliminate };
}
