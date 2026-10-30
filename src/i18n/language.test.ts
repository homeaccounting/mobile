import i18n from './index';
import { loadLanguage, setLanguage } from './language';
import { resetSecureStore, secureStoreMock } from '../../test/secureStore';

jest.mock(
  'expo-secure-store',
  () =>
    jest.requireActual<typeof import('../../test/secureStore')>('../../test/secureStore')
      .secureStoreMock,
);

afterEach(() => i18n.changeLanguage('en'));

it('applies the saved language', async () => {
  resetSecureStore({ 'ha.language': 'uk' });
  await loadLanguage();
  expect(i18n.language).toBe('uk');
});

it('ignores an unsupported saved value', async () => {
  resetSecureStore({ 'ha.language': 'de' });
  await loadLanguage();
  expect(i18n.language).toBe('en');
});

it('saves the chosen language', async () => {
  resetSecureStore();
  await setLanguage('uk');
  expect(i18n.language).toBe('uk');
  expect(secureStoreMock.setItemAsync).toHaveBeenCalledWith('ha.language', 'uk');
});
