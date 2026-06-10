import { render, screen } from '@testing-library/react';
import { OpponentArea } from './index';

describe('OpponentArea component', () => {
    test('renders the player name', () => {
        render(<OpponentArea name="Alice" handCount={3} score={12} isActive={false} position="top" />);
        expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    test('renders the correct number of face-down cards', () => {
        render(<OpponentArea name="Bob" handCount={4} score={0} isActive={false} position="top" />);
        const imgs = screen.getAllByRole('img');
        expect(imgs).toHaveLength(4);
        imgs.forEach(img => expect(img.src).toContain('cards/back.png'));
    });

    test('renders zero cards when handCount is 0', () => {
        render(<OpponentArea name="Bob" handCount={0} score={0} isActive={false} position="top" />);
        expect(screen.queryAllByRole('img')).toHaveLength(0);
    });

    test('renders the score badge', () => {
        render(<OpponentArea name="Carol" handCount={2} score={25} isActive={false} position="left" />);
        expect(screen.getByText('25')).toBeInTheDocument();
    });

    test('applies active-turn class when isActive is true', () => {
        const { container } = render(
            <OpponentArea name="Dave" handCount={3} score={0} isActive={true} position="right" />
        );
        expect(container.firstChild).toHaveClass('active-turn');
    });

    test('does not apply active-turn class when isActive is false', () => {
        const { container } = render(
            <OpponentArea name="Eve" handCount={3} score={0} isActive={false} position="top" />
        );
        expect(container.firstChild).not.toHaveClass('active-turn');
    });

    test('applies the correct position class', () => {
        const { container } = render(
            <OpponentArea name="Frank" handCount={2} score={5} isActive={false} position="left" />
        );
        expect(container.firstChild).toHaveClass('opponent-left');
    });

    test('falls back to 0 when score is undefined', () => {
        render(<OpponentArea name="Grace" handCount={2} isActive={false} position="top" />);
        expect(screen.getByText('0')).toBeInTheDocument();
    });
});
