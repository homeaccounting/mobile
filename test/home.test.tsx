import { act, render, screen } from '@testing-library/react-native';
import { AuthProvider } from '@/auth/AuthProvider';
import { createSessionStore } from '@/auth/session';
import i18n from '@/i18n';
import Home from '../app/(app)/index';
import { resetSecureStore } from './secureStore';

jest.mock(
  'expo-secure-store',
  () => jest.requireActual<typeof import('./secureStore')>('./secureStore').secureStoreMock,
);

it('renders the translated title and tagline with a sign out button', async () => {
  resetSecureStore({
    'ha.serverUrl': 'https://h',
    'ha.accessToken': 'a',
    'ha.refreshToken': 'r',
  });
  await i18n.changeLanguage('uk');
  await render(
    <AuthProvider store={createSessionStore()}>
      <Home />
    </AuthProvider>,
  );
  expect(screen.getByText('HomeAccounting')).toBeTruthy();
  expect(screen.getByText('Ваші рахунки — за один запит')).toBeTruthy();
  expect(screen.getByRole('button', { name: i18n.t('home.signOut') })).toBeTruthy();
  await act(() => i18n.changeLanguage('en'));
});
