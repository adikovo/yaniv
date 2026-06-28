import { getOpponentPositions } from './opponent-positions';

const p = (id) => ({ id, name: `Player${id}` });

describe('getOpponentPositions', () => {
    describe('2 players', () => {
        test('the other player is top', () => {
            const players = [p('A'), p('B')];
            expect(getOpponentPositions(players, 'A')).toEqual({ B: 'top' });
        });

        test('works regardless of which player is local', () => {
            const players = [p('A'), p('B')];
            expect(getOpponentPositions(players, 'B')).toEqual({ A: 'top' });
        });
    });

    describe('3 players', () => {
        const players = [p('A'), p('B'), p('C')];

        test('local=A: B is left, C is right', () => {
            expect(getOpponentPositions(players, 'A')).toEqual({ B: 'left', C: 'right' });
        });

        test('local=B: C is left, A is right', () => {
            expect(getOpponentPositions(players, 'B')).toEqual({ C: 'left', A: 'right' });
        });

        test('local=C: A is left, B is right', () => {
            expect(getOpponentPositions(players, 'C')).toEqual({ A: 'left', B: 'right' });
        });
    });

    describe('4 players', () => {
        const players = [p('A'), p('B'), p('C'), p('D')];

        test('local=A: B left, C top, D right', () => {
            expect(getOpponentPositions(players, 'A')).toEqual({ B: 'left', C: 'top', D: 'right' });
        });

        test('local=B: C left, D top, A right', () => {
            expect(getOpponentPositions(players, 'B')).toEqual({ C: 'left', D: 'top', A: 'right' });
        });

        test('local=D: A left, B top, C right', () => {
            expect(getOpponentPositions(players, 'D')).toEqual({ A: 'left', B: 'top', C: 'right' });
        });
    });

    describe('disconnect / player removal', () => {
        test('3-player game: after left opponent disconnects, remaining opponent moves to top', () => {
            // Started as 3 players: local=A, B=left, C=right
            // C disconnects → players array becomes [A, B] → B should now be top
            const after = [p('A'), p('B')];
            expect(getOpponentPositions(after, 'A')).toEqual({ B: 'top' });
        });

        test('3-player game: after right opponent disconnects, remaining opponent moves to top', () => {
            // Started as 3 players: local=A, B=left, C=right
            // B disconnects → players array becomes [A, C] → C should now be top
            const after = [p('A'), p('C')];
            expect(getOpponentPositions(after, 'A')).toEqual({ C: 'top' });
        });

        test('4-player game: after top opponent disconnects, 3 remaining rederive positions', () => {
            // Started as 4 players: local=A, B=left, C=top, D=right
            // C disconnects → [A, B, D] — B is (A+1)%3=left, D is (A+2)%3=right
            const after = [p('A'), p('B'), p('D')];
            expect(getOpponentPositions(after, 'A')).toEqual({ B: 'left', D: 'right' });
        });
    });

    describe('edge cases', () => {
        test('returns empty object when local player not found', () => {
            const players = [p('A'), p('B')];
            expect(getOpponentPositions(players, 'X')).toEqual({});
        });

        test('returns empty object for empty players array', () => {
            expect(getOpponentPositions([], 'A')).toEqual({});
        });
    });
});
