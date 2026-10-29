import * as Apple from 'expo-apple-authentication';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { IdTokenProvider } from '@/api/types';
import { signIn as googleSignIn } from '../../modules/google-id-token';

export type NativeSignInResult = { type: 'success'; idToken: string } | { type: 'cancelled' };

export async function nativeSignIn(
  provider: IdTokenProvider,
  nonce: string,
): Promise<NativeSignInResult> {
  if (provider === 'google') return googleSignIn(nonce);
  try {
    // Apple puts this nonce into the token unchanged.
    const { identityToken } = await Apple.signInAsync({
      nonce,
      requestedScopes: [Apple.AppleAuthenticationScope.EMAIL],
    });
    if (!identityToken) throw new Error('Apple returned no identity token');
    return { type: 'success', idToken: identityToken };
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return { type: 'cancelled' };
    throw e;
  }
}

export function isAppleSignInAvailable(): Promise<boolean> {
  if (Constants.expoConfig?.ios?.usesAppleSignIn !== true) return Promise.resolve(false);
  return Platform.OS === 'ios' ? Apple.isAvailableAsync() : Promise.resolve(false);
}
