import { render, screen } from '@testing-library/react';
import { CallOut } from './index';

describe('CallOut component', () => {
    test('variant="yaniv" → container has class "call-out"', () => {
        const { container } = render(<CallOut variant="yaniv" penalty={false} />);
        expect(container.firstChild).toHaveClass('call-out');
    });

    test('variant="yaniv" → container has class "call-out-yaniv"', () => {
        const { container } = render(<CallOut variant="yaniv" penalty={false} />);
        expect(container.firstChild).toHaveClass('call-out-yaniv');
    });

    test('variant="asaf" → container has class "call-out-asaf"', () => {
        const { container } = render(<CallOut variant="asaf" penalty={false} />);
        expect(container.firstChild).toHaveClass('call-out-asaf');
    });

    test('variant="yaniv" → renders text "YANIV!"', () => {
        render(<CallOut variant="yaniv" penalty={false} />);
        expect(screen.getByText('YANIV!')).toBeInTheDocument();
    });

    test('variant="asaf" → renders text "ASAF!"', () => {
        render(<CallOut variant="asaf" penalty={false} />);
        expect(screen.getByText('ASAF!')).toBeInTheDocument();
    });

    test('variant="yaniv" penalty={true} → "+30" is in the DOM', () => {
        render(<CallOut variant="yaniv" penalty={true} />);
        expect(screen.getByText('+30')).toBeInTheDocument();
    });

    test('variant="yaniv" penalty={false} → "+30" is NOT in the DOM', () => {
        render(<CallOut variant="yaniv" penalty={false} />);
        expect(screen.queryByText('+30')).not.toBeInTheDocument();
    });

    test('variant="asaf" penalty={false} → "+30" is NOT in the DOM', () => {
        render(<CallOut variant="asaf" penalty={false} />);
        expect(screen.queryByText('+30')).not.toBeInTheDocument();
    });

    test('variant="yaniv" penalty={true} → penalty is independent of variant — still shows "+30"', () => {
        render(<CallOut variant="yaniv" penalty={true} />);
        expect(screen.getByText('+30')).toBeInTheDocument();
        expect(screen.getByText('YANIV!')).toBeInTheDocument();
    });

    test('variant={undefined} → does not crash; base "call-out" class is present', () => {
        const { container } = render(<CallOut penalty={false} />);
        expect(container.firstChild).toHaveClass('call-out');
    });
});
