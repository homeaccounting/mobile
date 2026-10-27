import { ApiError, NetworkError } from '@/api/client';

export type AuthErrorKey =
  'unreachable' | 'invalidCredentials' | 'emailTaken' | 'notServer' | 'generic';

export function authErrorKey(err: unknown, op: 'login' | 'register'): AuthErrorKey {
  if (err instanceof NetworkError) return 'unreachable';
  if (!(err instanceof ApiError)) return 'generic';
  if (err.code === 'NOT_JSON' || (err.status === 404 && !err.code)) return 'notServer';
  // Wrong password (400) and unknown email (404) look identical so the screen
  // does not reveal whether an account exists (backend AuthService.login).
  if (
    op === 'login' &&
    ((err.status === 400 && err.code === 'ACCOUNT_ERROR') ||
      (err.status === 404 && err.code === 'NOT_FOUND'))
  ) {
    return 'invalidCredentials';
  }
  if (
    op === 'register' &&
    err.status === 400 &&
    err.code === 'ACCOUNT_ERROR' &&
    err.message.includes('already registered')
  ) {
    return 'emailTaken';
  }
  return 'generic';
}
