import { render, screen } from '@testing-library/react-native';
import Home from './index';

it('renders the app name', async () => {
  await render(<Home />);
  expect(screen.getByText('HomeAccounting')).toBeTruthy();
});
