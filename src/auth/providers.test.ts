import * as Apple from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { signIn as googleSignIn } from '../../modules/google-id-token';
import { isAppleSignInAvailable, nativeSignIn } from './providers';

jest.mock('../../modules/google-id-token', () => ({ signIn: jest.fn() }));
jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  isAvailableAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

const google = jest.mocked(googleSignIn);
const apple = jest.mocked(Apple);

afterEach(() => jest.restoreAllMocks());

describe('nativeSignIn', () => {
  it('passes the nonce to Google and returns its result', async () => {
    google.mockResolvedValue({ type: 'success', idToken: 'g' });
    await expect(nativeSignIn('google', 'n')).resolves.toEqual({ type: 'success', idToken: 'g' });
    expect(google).toHaveBeenCalledWith('n');
  });

  it('passes the nonce to Apple and asks for the email', async () => {
    apple.signInAsync.mockResolvedValue({
      identityToken: 'a',
    } as Apple.AppleAuthenticationCredential);
    await expect(nativeSignIn('apple', 'n')).resolves.toEqual({ type: 'success', idToken: 'a' });
    expect(apple.signInAsync).toHaveBeenCalledWith({
      nonce: 'n',
      requestedScopes: [Apple.AppleAuthenticationScope.EMAIL],
    });
  });

  it('treats an Apple cancel as cancelled', async () => {
    apple.signInAsync.mockRejectedValue(
      Object.assign(new Error('x'), { code: 'ERR_REQUEST_CANCELED' }),
    );
    await expect(nativeSignIn('apple', 'n')).resolves.toEqual({ type: 'cancelled' });
  });

  it('rejects an Apple credential without a token', async () => {
    apple.signInAsync.mockResolvedValue({
      identityToken: null,
    } as Apple.AppleAuthenticationCredential);
    await expect(nativeSignIn('apple', 'n')).rejects.toThrow();
  });
});

describe('isAppleSignInAvailable', () => {
  it('is false off iOS without asking the OS', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await expect(isAppleSignInAvailable()).resolves.toBe(false);
    expect(apple.isAvailableAsync).not.toHaveBeenCalled();
  });

  it('asks the OS on iOS', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    apple.isAvailableAsync.mockResolvedValue(true);
    await expect(isAppleSignInAvailable()).resolves.toBe(true);
  });
});
