import { useQuery } from '@tanstack/react-query';
import * as Apple from 'expo-apple-authentication';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/api/auth';
import type { IdTokenProvider } from '@/api/types';
import { createUnauthenticatedClient } from './api';
import { useAuth } from './AuthProvider';
import { authErrorKey } from './errors';
import { isAppleSignInAvailable } from './providers';
import { parseServerUrl } from './serverUrl';

interface Props {
  serverInput: string;
  disabled: boolean;
  onBusy: (busy: boolean) => void;
  onError: (messages: string[]) => void;
}

// Typing a server address must not query every partial host along the way.
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

export function SignInProviders({ serverInput, disabled, onBusy, onError }: Props) {
  const { t } = useTranslation();
  const auth = useAuth();
  const parsed = parseServerUrl(useDebounced(serverInput, 400));
  const serverUrl = parsed.ok ? parsed.url : null;
  const inFlight = useRef(false);
  // An older server without the endpoint, or an unreachable one, just shows no buttons.
  const { data: enabled } = useQuery({
    queryKey: ['authProviders', serverUrl],
    queryFn: () => authApi(createUnauthenticatedClient(serverUrl ?? '')).providers(),
    enabled: serverUrl !== null,
    retry: false,
    staleTime: 60_000,
  });
  const { data: appleAvailable } = useQuery({
    queryKey: ['appleSignInAvailable'],
    queryFn: isAppleSignInAvailable,
    staleTime: Infinity,
  });

  const google = enabled?.google === true;
  const apple = enabled?.apple === true && appleAvailable === true;
  if (!serverUrl || (!google && !apple)) return null;

  async function start(provider: IdTokenProvider, url: string) {
    if (disabled || inFlight.current) return;
    inFlight.current = true;
    onError([]);
    onBusy(true);
    try {
      // On success the guarded stack swaps this screen out, so busy stays set.
      if ((await auth.signInWithProvider(provider, url)) === 'signedIn') return;
    } catch (e) {
      const key = authErrorKey(e, 'oauth');
      const messages = [t(`errors.${key}`)];
      // http is only ever accepted for private hosts (see parseServerUrl).
      if (key === 'unreachable' && Platform.OS === 'ios' && new URL(url).protocol === 'http:')
        messages.push(t('auth.localNetworkHint'));
      onError(messages);
    }
    inFlight.current = false;
    onBusy(false);
  }

  return (
    <View>
      {google ? (
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => void start('google', serverUrl)}
          className="items-center rounded-lg border border-gray-300 py-3"
        >
          <Text className="text-base font-semibold text-gray-800">
            {t('auth.continueWithGoogle')}
          </Text>
        </Pressable>
      ) : null}
      {apple ? (
        <Apple.AppleAuthenticationButton
          buttonType={Apple.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={Apple.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={8}
          onPress={() => void start('apple', serverUrl)}
          style={{ height: 48, marginTop: google ? 12 : 0 }}
        />
      ) : null}
      <Text className="my-4 text-center text-gray-500">{t('auth.or')}</Text>
    </View>
  );
}
