import { screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import i18n from '@/i18n';
import AppLayout from '../app/(app)/_layout';
import Home from '../app/(app)/index';
import RootLayout from '../app/_layout';
import Register from '../app/register';
import SignIn from '../app/sign-in';
import { resetSecureStore } from './secureStore';

jest.mock('../global.css', () => ({}));
jest.mock(
  'expo-secure-store',
  () => jest.requireActual<typeof import('./secureStore')>('./secureStore').secureStoreMock,
);

const routes = {
  _layout: RootLayout,
  '(app)/_layout': AppLayout,
  '(app)/index': Home,
  'sign-in': SignIn,
  register: Register,
};

it('opens sign-in at / when signed out', async () => {
  resetSecureStore();
  const router = await renderRouter(routes, { initialUrl: '/' });
  expect(await screen.findByLabelText(i18n.t('auth.email'))).toBeTruthy();
  expect(router.getPathname()).toBe('/sign-in');
});

it('opens home at / when signed in', async () => {
  resetSecureStore({
    'ha.serverUrl': 'https://h',
    'ha.accessToken': 'a',
    'ha.refreshToken': 'r',
  });
  const router = await renderRouter(routes, { initialUrl: '/' });
  expect(await screen.findByRole('button', { name: i18n.t('home.signOut') })).toBeTruthy();
  expect(router.getPathname()).toBe('/');
});
