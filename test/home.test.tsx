import { act, render, screen } from '@testing-library/react-native';
import i18n from '@/i18n';
import Home from '../app/index';

it('renders the translated title and tagline', async () => {
  await i18n.changeLanguage('uk');
  await render(<Home />);
  expect(screen.getByText('HomeAccounting')).toBeTruthy();
  expect(screen.getByText('Ваші рахунки — за один запит')).toBeTruthy();
  await act(() => i18n.changeLanguage('en'));
});
