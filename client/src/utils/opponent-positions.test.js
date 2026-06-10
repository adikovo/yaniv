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

        test('local=A: B is right, C is left', () => {
            expect(getOpponentPositions(players, 'A')).toEqual({ B: 'right', C: 'left' });
        });

        test('local=B: C is right, A is left', () => {
            expect(getOpponentPositions(players, 'B')).toEqual({ C: 'right', A: 'left' });
        });

        test('local=C: A is right, B is left', () => {
            expect(getOpponentPositions(players, 'C')).toEqual({ A: 'right', B: 'left' });
        });
    });

    describe('4 players', () => {
        const players = [p('A'), p('B'), p('C'), p('D')];

        test('local=A: B right, C top, D left', () => {
            expect(getOpponentPositions(players, 'A')).toEqual({ B: 'right', C: 'top', D: 'left' });
        });

        test('local=B: C right, D top, A left', () => {
            expect(getOpponentPositions(players, 'B')).toEqual({ C: 'right', D: 'top', A: 'left' });
        });

        test('local=D: A right, B top, C left', () => {
            expect(getOpponentPositions(players, 'D')).toEqual({ A: 'right', B: 'top', C: 'left' });
        });
    });

    describe('disconnect / player removal', () => {
        test('3-player game: after left opponent disconnects, remaining opponent moves to top', () => {
            // Started as 3 players: local=A, B=right, C=left
            // C disconnects → players array becomes [A, B] → B should now be top
            const after = [p('A'), p('B')];
            expect(getOpponentPositions(after, 'A')).toEqual({ B: 'top' });
        });

        test('3-player game: after right opponent disconnects, remaining opponent moves to top', () => {
            // Started as 3 players: local=A, B=right, C=left
            // B disconnects → players array becomes [A, C] → C should now be top
            const after = [p('A'), p('C')];
            expect(getOpponentPositions(after, 'A')).toEqual({ C: 'top' });
        });

        test('4-player game: after top opponent disconnects, 3 remaining rederive positions', () => {
            // Started as 4 players: local=A, B=right, C=top, D=left
            // C disconnects → [A, B, D] — B is (A+1)%3=right, D is (A+2)%3=left
            const after = [p('A'), p('B'), p('D')];
            expect(getOpponentPositions(after, 'A')).toEqual({ B: 'right', D: 'left' });
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
