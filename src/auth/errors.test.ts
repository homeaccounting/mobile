import { ApiError, NetworkError } from '@/api/client';
import { authErrorKey } from './errors';

const api = (status: number, code?: string, message = 'x') =>
  new ApiError({ status, code, message });

describe('authErrorKey', () => {
  it('maps network failures', () =>
    expect(authErrorKey(new NetworkError(), 'login')).toBe('unreachable'));
  it('treats wrong password and unknown email the same on login', () => {
    expect(authErrorKey(api(400, 'ACCOUNT_ERROR'), 'login')).toBe('invalidCredentials');
    expect(authErrorKey(api(404, 'NOT_FOUND'), 'login')).toBe('invalidCredentials');
  });
  it('maps a duplicate email on register', () =>
    expect(authErrorKey(api(400, 'ACCOUNT_ERROR', 'Email already registered'), 'register')).toBe(
      'emailTaken',
    ));
  it('flags a server that is not HomeAccounting', () => {
    expect(authErrorKey(api(404), 'login')).toBe('notServer');
    expect(authErrorKey(api(200, 'NOT_JSON'), 'login')).toBe('notServer');
  });
  it('falls back to generic', () => {
    expect(authErrorKey(api(500), 'login')).toBe('generic');
    expect(authErrorKey(api(400, 'ACCOUNT_ERROR'), 'register')).toBe('generic');
    expect(authErrorKey(new Error('boom'), 'register')).toBe('generic');
  });
  it('maps ID-token sign-in failures', () => {
    expect(authErrorKey(api(401, 'UNAUTHENTICATED'), 'oauth')).toBe('providerRejected');
    expect(authErrorKey(api(503), 'oauth')).toBe('providerUnavailable');
    expect(authErrorKey(api(400, 'ACCOUNT_ERROR'), 'oauth')).toBe('generic');
    expect(authErrorKey(new NetworkError(), 'oauth')).toBe('unreachable');
    expect(authErrorKey(api(401), 'login')).toBe('generic');
  });
});
