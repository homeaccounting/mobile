import { requireNativeModule } from 'expo';

export type GoogleSignInResult = { type: 'success'; idToken: string } | { type: 'cancelled' };

// The free Google sign-in library can't pass a nonce, and the backend requires a
// server-bound one, so this wraps the platform SDKs directly.
// Looked up lazily: Jest imports this file transitively and has no native module.
export function signIn(nonce: string): Promise<GoogleSignInResult> {
  const native = requireNativeModule<{ signIn(nonce: string): Promise<GoogleSignInResult> }>(
    'GoogleIdToken',
  );
  return native.signIn(nonce);
}
