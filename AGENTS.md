# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

## Project Overview

Expo + React Native app (iOS and Android) that consumes the [HomeAccounting backend](../backend/). Built with Expo Router, TypeScript (strict), TanStack Query, i18next (en/uk) and NativeWind 4.

- **Node**: 22 (enforced via `engines`)
- **Package manager**: pnpm 10 (`packageManager` in `package.json`; lockfile committed)
- **Routing**: Expo Router (file-based, `app/`)
- **Server state**: `@tanstack/react-query`
- **i18n**: `i18next` + `react-i18next`, languages `en` and `uk`
- **Styling**: NativeWind 4 (Tailwind classes)

## Development Environment

The project uses **Nix** to manage development tooling. Run `nix develop` at the start of each session (or rely on `direnv` via `.envrc`). It provides `node`, `pnpm`, `just`, Watchman, CocoaPods (macOS), JDK 17 (`JAVA_HOME`) and the Android SDK (`ANDROID_HOME`: platform 37, build tools, NDK, CMake, emulator and system images). Do not install project tooling globally; add it to `flake.nix`. The Android versions in `flake.nix` follow `node_modules/react-native/gradle/libs.versions.toml`; bump them together with the Expo SDK.

The one thing a project shell cannot provide is **Xcode** (licence-bound, not in nixpkgs). Install it system-wide; maintainer machines get it declaratively from the Nix system config (Mac App Store via `mas`). After installing or updating Xcode, run `just ios-setup` once: it selects Xcode, accepts the licence, installs the simulator components and downloads the iOS runtime, skipping whatever is already done. Machine-level settings such as the npm registry also belong in the system config, not in this repo.

Local installs may go through the org npm mirror, so run `just install` (which makes the lockfile registry-neutral: no explicit tarball URLs, so pnpm fetches from whichever registry is configured — the mirror locally, public npm in CI) rather than bare `pnpm install`, and never commit a mirror `.npmrc`. The committed `pnpm-lock.yaml` must not contain `wixpress` or `tarball:` URLs.

**Upgrading the Expo SDK through the mirror.** The mirror delays packages by about two weeks, while Expo's live version API always points at the newest patch, so plain `expo install --fix` asks for versions the mirror doesn't have yet. Instead: `pnpm exec expo install expo@^<sdk>.0.0`, then `EXPO_OFFLINE=1 pnpm exec expo install --fix` (offline mode aligns every Expo-managed package to the _installed_ `expo`'s `bundledNativeModules.json`). Then check for stale peers pnpm auto-installed for the old SDK (`react-native-gesture-handler`, `@expo/dom-webview`, `@react-native/jest-preset`, `jest`): `jest-expo`'s and `expo`'s `peerDependencies` name the expected ranges. Online `expo-doctor` will flag patch versions newer than the mirror; that's the mirror lag, not a problem. `package.json`'s `jest.transformIgnorePatterns` is jest-expo's default plus `@noble`; re-copy it from `node_modules/jest-expo/jest-preset.js` on an SDK bump.

The app runs as a **dev build** (`just ios-run` / `just android-run`), not Expo Go. `ios/` and `android/` are generated and gitignored — change native config through `app.json` / config plugins only.

**EAS.** The project is `@homeaccounting/homeaccounting` on expo.dev (the `homeaccounting` organization). `eas.json` has `development`, `preview` and `production` profiles, with the version kept on EAS (`appVersionSource: remote`). The runtime version is the native-code fingerprint, so an OTA update reaches only builds whose native code matches. On every merge to `master`, `.github/workflows/preview.yml` runs `just eas-release-preview`: a new `preview` build (an APK through internal distribution) if no build has the current fingerprint, otherwise an OTA update on the `preview` channel. So a native change (a new native package, an `app.json` plugin change) costs a cloud build and a JS-only change doesn't. CI authenticates with `EXPO_TOKEN`, a robot token declared in `../infra`. EAS holds the Android keystore; the preview builds' signing SHA-1 is different from the debug keystore's, so Google sign-in in a preview build needs its own Android OAuth client (`just eas-credentials` shows the SHA-1). `eas-cli` is a pinned dev dependency: run it as `pnpm exec eas` or through the recipes.

**Android emulator.** Start it with `just android-emulator` before `just android-run`: it needs `-gpu swiftshader_indirect`, or Google's sign-in WebView crashes. Google sign-in also needs a Google account added in the emulator's Settings.

**Local backend.** Use server `http://localhost:8080` on the iOS simulator and `http://10.0.2.2:8080` on the Android emulator; the backend needs `ID_TOKEN_SERVER_URLS=http://10.0.2.2:8080` for the latter.

## Common Commands

All commands use `just` (task runner). Run `just --list` to see all recipes.

```bash
just install            # pnpm install + lockfile-fix
just metro-start        # Metro dev server for an installed dev build
just ios-setup          # one-time Xcode setup (licence, simulator components, iOS runtime)
just ios-run            # build and launch on the iOS simulator
just android-emulator   # create (first run) and start the Android emulator
just android-run        # build and launch on an Android emulator/device
just typecheck          # tsc --noEmit
just lint               # eslint .
just format             # prettier --write .
just format-check       # prettier --check .
just check              # typecheck + lint + format-check
just test               # jest
just expo-doctor        # expo-doctor
just native-verify      # release JS bundles for ios + android, as Gradle/Xcode build them (no simulator needed)
just e2e [server]       # Maestro flows in e2e/ on the booted simulator/emulator
just e2e-fake-llm       # fake OpenAI-compatible LLM for E2E without a real key
just android-build-apk  # debug APK of the dev build (prebuild + Gradle)
just eas-build          # EAS cloud build (default: preview, android)
just eas-update         # OTA update (default: preview channel, android)
just eas-fingerprint    # native-code hash that builds and updates match on
just eas-release-preview # what CI runs on merge: build if the fingerprint is new, else update
just eas-credentials    # signing keys EAS holds (e.g. the SHA-1 for Google sign-in)
just lockfile-fix       # rewrite private-registry URLs in pnpm-lock.yaml
just clean              # remove node_modules/.expo/ios/android/coverage
```

`just native-verify` is the way to validate native bundling on machines without a simulator; CI runs it too. For native config changes, also run `pnpm exec expo prebuild --no-install --clean` (regenerates the gitignored `ios/` and `android/`; run `just clean` afterwards if you don't want them lying around).

## Architecture

```
app/       # Expo Router routes only (_layout.tsx, index.tsx, …)
modules/   # Local Expo native modules (autolinked); google-id-token wraps the Google SDKs
plugins/   # Local config plugins (Sign in with Apple switch)
src/
├── api/   # Typed HTTP client, ported from web and trimmed to the MVP
├── auth/  # Sign-in: serverUrl, session, api, errors, AuthProvider, nonce, providers, SignInProviders
├── home/  # Home screen: account list, prompt bar, result card, settings sheet
├── i18n/  # i18next setup; strings in locales/{en,uk}.json
└── lib/   # Utilities (queryClient, …)
test/      # Tests for routes and shared test helpers (fetch.ts)
e2e/       # Maestro flows, their seed script and CI's fake LLM
```

- `src/api` is ported from `web`. Keep the shapes in sync with `web/src/api/types.ts`, which mirrors the backend types.
- Path alias `@/*` → `src/*`.
- `react-native-css-interop` is a direct dependency on purpose, pinned to the version `nativewind` uses. pnpm's strict layout otherwise hides it and Metro cannot resolve NativeWind's `jsx-runtime`. Do not remove it as "unused".
- `babel-preset-expo` and `@babel/plugin-transform-react-jsx` are direct dev dependencies for the same reason: Babel resolves the names in `babel.config.js` and in NativeWind's preset from the project's `node_modules`. Without them a release build's JS bundle fails (`Cannot find module`) when Gradle runs it with plain `node`; `pnpm exec` and Metro in dev happen to find them anyway, so only EAS and `--dev false` bundles show it.

## Sign-in and session

- Self-hosted servers on a LAN use plain http. Android allows cleartext globally (`expo-build-properties`) because its network-security config can't express IP ranges, so `parseServerUrl` in `src/auth/serverUrl.ts` is the enforcement point: it allows http only for private hosts. iOS uses ATS `NSAllowsLocalNetworking`.
- A crash between refresh-token rotation and the keystore write signs the user out on next launch (ADR 007 reuse rule).
- `.expo/types` is generated; restart Metro after adding routes.
- Tests mock `expo-secure-store` via `test/secureStore.ts`.
- Google and Apple sign-in send the provider ID token with a server-bound nonce (`src/auth/nonce.ts`). The format is owned by the backend (its ID-token spec §3.2): change both sides together, and keep the known-answer tests in `nonce.test.ts` equal to the backend's.
- `modules/google-id-token` is our own Expo module because the free Google sign-in library cannot pass a nonce. Its client IDs are config-plugin props in `app.json` (public values). Native changes there are verified only by a prebuild plus `just ios-run` / `just android-run` and a manual sign-in; Jest mocks the module.
- Every backend the app signs in to must list the official web and iOS Google client IDs in `GOOGLE_ID_TOKEN_AUDIENCES` (the backend default does). The Android OAuth client is registered with the debug-keystore SHA-1, so release builds need their SHA-1 added.
- The sign-in screens show a provider's button only when `GET /api/auth/providers` on the chosen server enables it.
- Sign in with Apple is off until the paid Apple Developer account exists. To turn it on, set `ios.usesAppleSignIn: true` in `app.json`: that restores the `com.apple.developer.applesignin` entitlement and shows the Apple button. Keep `plugins/with-apple-sign-in-switch.js` listed before `expo-apple-authentication`, since config mods run in reverse registration order.

## Testing

Jest via `jest-expo`, with React Native Testing Library.

- **Never put tests under `app/`.** Expo Router bundles every file in `app/` as a route. Tests live in `test/` or next to the module under `src/` (`*.test.ts` / `*.test.tsx`).
- API tests use the fetch helper in `test/fetch.ts`.
- Every new user-facing string goes in both `src/i18n/locales/en.json` and `src/i18n/locales/uk.json`.

**E2E.** `just e2e` runs the Maestro flows in `e2e/` against a local backend (`just run` in `../backend`) with `LLM_API_KEY` set, since the flow records a real prompt. Start the dev build first, with the device in English. On Android, pass the emulator's view of the host: `just e2e http://10.0.2.2:8080`. `e2e/seed.js` runs on the host and creates a fresh user each run, with a 100 USD account as their default (the prompt records to the default account). The flow clears the app's data, so it signs the device out. It passes on the Android emulator; on the iOS simulator (Xcode 27, no Simulator.app) Maestro can't type into the password field, so iOS runs stop at sign-in.

`.github/workflows/e2e.yml` runs the same flows nightly (and on PRs touching `e2e/`) on an Android emulator, against the published backend image with `e2e/fake-llm.js` standing in for the LLM: it answers every prompt with the flow's "coffee 4.50" expense, so CI needs no LLM key. Change it together with the prompt in `e2e/home.yaml`.

```bash
pnpm exec jest -t "name"        # filter by test name
pnpm exec jest src/api          # by path
```

## Code Style

- **Formatter**: Prettier (with `prettier-plugin-tailwindcss`), config identical to `web`. Run `just format` before committing.
- **Linter**: ESLint flat config with `eslint-config-expo` and `typescript-eslint`. Don't disable rules without a documented reason.
- **TypeScript**: `strict`. CI runs `tsc --noEmit`.
- Install Expo-managed packages with `pnpm exec expo install <pkg>` so versions match the SDK.

## Change Philosophy

- Treat existing code, types, tests, and documentation as intentionally designed
- Modifications should be strictly additive by default
- Never remove or significantly alter existing content without explicit request or documented evidence of incorrectness
