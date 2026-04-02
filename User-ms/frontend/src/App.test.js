import { render, screen } from '@testing-library/react';

test('jest renders a simple smoke component', () => {
    render(<div>Frontend test runner is working</div>);
    expect(screen.getByText(/frontend test runner is working/i)).toBeInTheDocument();
});
