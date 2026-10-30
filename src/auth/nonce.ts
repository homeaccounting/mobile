import { sha256 } from '@noble/hashes/sha2.js';
import { getRandomBytes } from 'expo-crypto';

// The format is the backend's (ID-token spec §3.2): the nonce is bound to the
// server, so a token minted for one server is refused by every other.
export function bindNonce(serverUrl: string, rawNonce: string): string {
  return base64Url(sha256(new TextEncoder().encode(`${serverUrl}\n${rawNonce}`)));
}

export function newRawNonce(): string {
  return base64Url(getRandomBytes(32));
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
