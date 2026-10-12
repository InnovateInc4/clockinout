import { render, screen } from '@testing-library/react';
import LoginAdmin from './components/LoginAdmin';

test('renders the secure staff login screen', () => {
  render(<LoginAdmin />);

  expect(
    screen.getByRole('heading', {
      name: /sign in to your account/i
    })
  ).toBeInTheDocument();

  expect(
    screen.getByRole('button', {
      name: /sign in/i
    })
  ).toBeInTheDocument();
});
