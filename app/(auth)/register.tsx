import { Link } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useAuth } from '@/auth/AuthProvider';
import { authErrorKey } from '@/auth/errors';
import { ServerField } from '@/auth/ServerField';
import { HOSTED_SERVER_URL, parseServerUrl } from '@/auth/serverUrl';
import { hasSignInProviders, SignInProviders } from '@/auth/SignInProviders';

const schema = z.object({ email: z.email(), password: z.string().min(8) });

export default function Register() {
  const { t } = useTranslation();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // null until the user edits it, so a remembered server that loads after mount is still picked up.
  const [serverEdit, setServerInput] = useState<string | null>(null);
  const serverInput = serverEdit ?? auth.lastServerUrl ?? HOSTED_SERVER_URL;
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; server?: string }>({});
  const [banner, setBanner] = useState<string[]>([]);

  async function submit() {
    setBanner([]);
    const server = parseServerUrl(serverInput);
    if (!server.ok) {
      setErrors({
        server: t(server.reason === 'insecure' ? 'errors.insecureServer' : 'errors.invalidServer'),
      });
      return;
    }
    const parsed = schema.safeParse({ email: email.trim(), password });
    if (!parsed.success) {
      const failed = new Set(parsed.error.issues.map((i) => i.path[0]));
      setErrors({
        email: failed.has('email') ? t('errors.invalidEmail') : undefined,
        password: failed.has('password') ? t('errors.passwordMin') : undefined,
      });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await auth.register({ email, password, serverUrl: server.url });
    } catch (e) {
      const key = authErrorKey(e, 'register');
      const messages = [t(`errors.${key}`)];
      // http is only ever accepted for private hosts (see parseServerUrl).
      if (key === 'unreachable' && new URL(server.url).protocol === 'http:')
        messages.push(t('auth.localNetworkHint'));
      if (key === 'emailTaken') setErrors({ email: messages[0] });
      else setBanner(messages);
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center p-6"
        keyboardShouldPersistTaps="handled"
      >
        <SignInProviders />
        {hasSignInProviders ? (
          <Text className="my-4 text-center text-gray-500">{t('auth.or')}</Text>
        ) : null}
        <TextInput
          value={email}
          onChangeText={setEmail}
          accessibilityLabel={t('auth.email')}
          placeholder={t('auth.email')}
          autoComplete="email"
          textContentType="emailAddress"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          className="rounded-lg border border-gray-300 px-3 py-2 text-base"
        />
        {errors.email ? <Text className="mt-1 text-sm text-red-600">{errors.email}</Text> : null}
        <TextInput
          value={password}
          onChangeText={setPassword}
          accessibilityLabel={t('auth.password')}
          placeholder={t('auth.password')}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          className="mt-3 rounded-lg border border-gray-300 px-3 py-2 text-base"
        />
        {errors.password ? (
          <Text className="mt-1 text-sm text-red-600">{errors.password}</Text>
        ) : null}
        {banner.map((m) => (
          <Text key={m} className="mt-3 text-sm text-red-600">
            {m}
          </Text>
        ))}
        <Pressable
          accessibilityRole="button"
          disabled={submitting}
          onPress={() => void submit()}
          className="mt-4 items-center rounded-lg bg-blue-600 py-3"
        >
          <Text className="text-base font-semibold text-white">{t('auth.register')}</Text>
        </Pressable>
        <Link href="/sign-in" asChild>
          <Pressable accessibilityRole="link" className="mt-4 items-center">
            <Text className="text-blue-600">{t('auth.haveAccount')}</Text>
          </Pressable>
        </Link>
        <ServerField value={serverInput} onChange={setServerInput} error={errors.server} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
