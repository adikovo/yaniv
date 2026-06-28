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

describe('OpponentArea XSS / injection safety', () => {
    test('renders an <img onerror> payload as inert literal text, not a live element', () => {
        const payload = '<img src=x onerror="alert(1)">';
        const { container } = render(
            <OpponentArea name={payload} handCount={3} score={12} isActive={false} position="top" />
        );

        // The payload appears as literal text inside the name span.
        expect(screen.getByText(payload)).toBeInTheDocument();
        expect(container.querySelector('.opponent-name')).toHaveTextContent(payload);

        // React escaped it, so no live <img> element was created from the name.
        // (Face-down card images would have role="img" via <img>, so scope to the name span.)
        const nameSpan = container.querySelector('.opponent-name');
        expect(nameSpan.querySelector('img')).toBeNull();
    });

    test('renders a <script> payload as inert literal text, not a live element', () => {
        const payload = '<script>alert(1)</script>';
        const { container } = render(
            <OpponentArea name={payload} handCount={0} score={0} isActive={false} position="top" />
        );

        // The payload appears as literal text.
        expect(screen.getByText(payload)).toBeInTheDocument();
        expect(container.querySelector('.opponent-name')).toHaveTextContent(payload);

        // No live <script> node was injected into the rendered tree.
        expect(container.querySelector('script')).toBeNull();
    });
});

describe('OpponentArea callout prop', () => {
    const baseProps = { name: 'Alice', handCount: 3, score: 10, isActive: false, position: 'top' };

    test('renders CallOut when callout prop is set with yaniv variant', () => {
        render(<OpponentArea {...baseProps} callout={{ variant: 'yaniv', penalty: false }} />);
        expect(screen.getByText('YANIV!')).toBeInTheDocument();
    });

    test('renders CallOut with asaf variant and penalty', () => {
        render(<OpponentArea {...baseProps} callout={{ variant: 'asaf', penalty: true }} />);
        expect(screen.getByText('ASAF!')).toBeInTheDocument();
        expect(screen.getByText('+30')).toBeInTheDocument();
    });

    test('renders no CallOut when callout is null', () => {
        render(<OpponentArea {...baseProps} callout={null} />);
        expect(screen.queryByText('YANIV!')).not.toBeInTheDocument();
        expect(screen.queryByText('ASAF!')).not.toBeInTheDocument();
    });

    test('renders no CallOut when callout is undefined (prop omitted)', () => {
        render(<OpponentArea {...baseProps} />);
        expect(screen.queryByText('YANIV!')).not.toBeInTheDocument();
        expect(screen.queryByText('ASAF!')).not.toBeInTheDocument();
    });
});

describe('OpponentArea callout anchoring by position', () => {
    const baseProps = { name: 'Alice', handCount: 3, score: 10, isActive: false };

    test('callout is rendered inside the positioned container for position="left"', () => {
        const { container } = render(
            <OpponentArea {...baseProps} position="left" callout={{ variant: 'yaniv', penalty: false }} />
        );
        expect(container.querySelector('.opponent-left .call-out')).not.toBeNull();
    });

    test('callout is rendered inside the positioned container for position="top"', () => {
        const { container } = render(
            <OpponentArea {...baseProps} position="top" callout={{ variant: 'yaniv', penalty: false }} />
        );
        expect(container.querySelector('.opponent-top .call-out')).not.toBeNull();
    });

    test('callout is rendered inside the positioned container for position="right"', () => {
        const { container } = render(
            <OpponentArea {...baseProps} position="right" callout={{ variant: 'yaniv', penalty: false }} />
        );
        expect(container.querySelector('.opponent-right .call-out')).not.toBeNull();
    });
});

// T007 — fixed-size active-seat highlight (FR-009)
// The active-turn highlight must be carried by a fixed-size seat panel
// (`.opponent-seat`, applied to the outer `.opponent-area` element), NOT by the
// inner `.opponent-hand`. This decouples the highlight from the number of cards.
describe('OpponentArea active-seat highlight (T007, FR-009)', () => {
    const baseProps = { name: 'Alice', score: 10, position: 'top' };

    test('seat panel (firstChild) carries the opponent-seat class', () => {
        const { container } = render(
            <OpponentArea {...baseProps} handCount={3} isActive={false} />
        );
        expect(container.firstChild).toHaveClass('opponent-seat');
    });

    test('when active, firstChild has BOTH opponent-seat and active-turn', () => {
        const { container } = render(
            <OpponentArea {...baseProps} handCount={3} isActive={true} />
        );
        expect(container.firstChild).toHaveClass('opponent-seat');
        expect(container.firstChild).toHaveClass('active-turn');
    });

    test('active-turn highlight does NOT live on the inner .opponent-hand', () => {
        const { container } = render(
            <OpponentArea {...baseProps} handCount={3} isActive={true} />
        );
        const hand = container.querySelector('.opponent-hand');
        expect(hand).not.toBeNull();
        expect(hand).not.toHaveClass('active-turn');
    });

    test('seat panel is a stable wrapper around the hand with handCount=1', () => {
        const { container } = render(
            <OpponentArea {...baseProps} handCount={1} isActive={true} />
        );
        // The seat panel exists and wraps the hand, independent of card count.
        expect(container.firstChild).toHaveClass('opponent-seat');
        expect(container.firstChild.querySelector('.opponent-hand')).not.toBeNull();
    });

    test('seat panel is a stable wrapper around the hand with handCount=5', () => {
        const { container } = render(
            <OpponentArea {...baseProps} handCount={5} isActive={true} />
        );
        expect(container.firstChild).toHaveClass('opponent-seat');
        expect(container.firstChild.querySelector('.opponent-hand')).not.toBeNull();
    });
});

// T008 — eliminated de-emphasis + fade (FR-010 a/b)
describe('OpponentArea eliminated / leaving state (T008, FR-010)', () => {
    const baseProps = { name: 'Alice', handCount: 3, score: 10, isActive: false, position: 'top' };

    test('applies eliminated class when eliminated prop is true', () => {
        const { container } = render(<OpponentArea {...baseProps} eliminated />);
        expect(container.firstChild).toHaveClass('eliminated');
    });

    test('does not apply eliminated class when eliminated prop is omitted', () => {
        const { container } = render(<OpponentArea {...baseProps} />);
        expect(container.firstChild).not.toHaveClass('eliminated');
    });

    test('does not apply eliminated class when eliminated prop is false', () => {
        const { container } = render(<OpponentArea {...baseProps} eliminated={false} />);
        expect(container.firstChild).not.toHaveClass('eliminated');
    });

    test('applies leaving class when leaving prop is true', () => {
        const { container } = render(<OpponentArea {...baseProps} eliminated leaving />);
        expect(container.firstChild).toHaveClass('leaving');
    });

    test('does not apply leaving class when leaving prop is omitted', () => {
        const { container } = render(<OpponentArea {...baseProps} eliminated />);
        expect(container.firstChild).not.toHaveClass('leaving');
    });

    test('does not apply leaving class when leaving prop is false', () => {
        const { container } = render(<OpponentArea {...baseProps} eliminated leaving={false} />);
        expect(container.firstChild).not.toHaveClass('leaving');
    });
});
