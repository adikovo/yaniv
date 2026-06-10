import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from './index';

const faceUpCard = { value: '5', suit: 'H', numeric_val: 5, index: 0 };

describe('Card component', () => {
    describe('faceDown prop', () => {
        test('renders back.png when faceDown is true', () => {
            render(<Card faceDown card={faceUpCard} onClick={() => {}} />);
            const img = screen.getByRole('img');
            expect(img.src).toContain('cards/back.png');
        });

        test('renders the face-up image when faceDown is false', () => {
            render(<Card faceDown={false} card={faceUpCard} onClick={() => {}} />);
            const img = screen.getByRole('img');
            expect(img.src).toContain('5_of_hearts.png');
        });

        test('clicking a faceDown card does not call onClick', () => {
            const onClick = vi.fn();
            render(<Card faceDown card={faceUpCard} onClick={onClick} />);
            fireEvent.click(screen.getByRole('img'));
            expect(onClick).not.toHaveBeenCalled();
        });

        test('clicking a face-up card calls onClick with the card index', () => {
            const onClick = vi.fn();
            render(<Card card={faceUpCard} onClick={onClick} />);
            fireEvent.click(screen.getByRole('img'));
            expect(onClick).toHaveBeenCalledWith(0);
        });
    });
});
