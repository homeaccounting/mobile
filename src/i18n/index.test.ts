import i18n from '@/i18n';

describe('i18n', () => {
  afterEach(() => i18n.changeLanguage('en'));

  it('has English strings', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('home.title')).toBe('HomeAccounting');
    expect(i18n.t('home.tagline')).toBe('Your accounts, one prompt away');
  });

  it('has Ukrainian strings', async () => {
    await i18n.changeLanguage('uk');
    expect(i18n.t('home.tagline')).toBe('Ваші рахунки — за один запит');
  });

  it('falls back to English for an unsupported language', async () => {
    await i18n.changeLanguage('de');
    expect(i18n.t('home.tagline')).toBe('Your accounts, one prompt away');
  });
});
