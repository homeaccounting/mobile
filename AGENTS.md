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

**Upgrading the Expo SDK through the mirror.** The mirror delays packages by about two weeks, while Expo's live version API always points at the newest patch, so plain `expo install --fix` asks for versions the mirror doesn't have yet. Instead: `pnpm exec expo install expo@^<sdk>.0.0`, then `EXPO_OFFLINE=1 pnpm exec expo install --fix` (offline mode aligns every Expo-managed package to the _installed_ `expo`'s `bundledNativeModules.json`). Then check for stale peers pnpm auto-installed for the old SDK (`react-native-gesture-handler`, `@expo/dom-webview`, `@react-native/jest-preset`, `jest`): `jest-expo`'s and `expo`'s `peerDependencies` name the expected ranges. Online `expo-doctor` will flag patch versions newer than the mirror; that's the mirror lag, not a problem.

The app runs as a **dev build** (`just ios-run` / `just android-run`), not Expo Go. `ios/` and `android/` are generated and gitignored — change native config through `app.json` / config plugins only.

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
just native-verify      # expo export for ios + android into a temp dir (no simulator needed)
just lockfile-fix       # rewrite private-registry URLs in pnpm-lock.yaml
just clean              # remove node_modules/.expo/ios/android/coverage
```

`just native-verify` is the way to validate native bundling on machines without a simulator. For native config changes, also run `pnpm exec expo prebuild --no-install --clean` (regenerates the gitignored `ios/` and `android/`; run `just clean` afterwards if you don't want them lying around).

## Architecture

```
app/       # Expo Router routes only (_layout.tsx, index.tsx, …)
modules/   # Local Expo native modules (autolinked); google-id-token wraps the Google SDKs
plugins/   # Local config plugins (Sign in with Apple switch)
src/
├── api/   # Typed HTTP client, ported from web and trimmed to the MVP
├── auth/  # Sign-in: serverUrl, session, api, errors, AuthProvider
├── i18n/  # i18next setup; strings in locales/{en,uk}.json
└── lib/   # Utilities (queryClient, …)
test/      # Tests for routes and shared test helpers (fetch.ts)
```

- `src/api` is ported from `web`. Keep the shapes in sync with `web/src/api/types.ts`, which mirrors the backend types.
- Path alias `@/*` → `src/*`.
- `react-native-css-interop` is a direct dependency on purpose, pinned to the version `nativewind` uses. pnpm's strict layout otherwise hides it and Metro cannot resolve NativeWind's `jsx-runtime`. Do not remove it as "unused".

## Sign-in and session

- Self-hosted servers on a LAN use plain http. Android allows cleartext globally (`expo-build-properties`) because its network-security config can't express IP ranges, so `parseServerUrl` in `src/auth/serverUrl.ts` is the enforcement point: it allows http only for private hosts. iOS uses ATS `NSAllowsLocalNetworking`.
- A crash between refresh-token rotation and the keystore write signs the user out on next launch (ADR 007 reuse rule).
- `.expo/types` is generated; restart Metro after adding routes.
- Tests mock `expo-secure-store` via `test/secureStore.ts`.
- Google and Apple sign-in send the provider ID token with a server-bound nonce (`src/auth/nonce.ts`). The format is owned by the backend (its ID-token spec §3.2): change both sides together, and keep the known-answer tests in `nonce.test.ts` equal to the backend's.
- `modules/google-id-token` is our own Expo module because the free Google sign-in library cannot pass a nonce. Its client IDs are config-plugin props in `app.json` (public values). Native changes there are verified only by a prebuild plus `just ios-run` / `just android-run` and a manual sign-in; Jest mocks the module.
- The sign-in screens show a provider's button only when `GET /api/auth/providers` on the chosen server enables it.
- Sign in with Apple is off until the paid Apple Developer account exists. To turn it on, set `ios.usesAppleSignIn: true` in `app.json`: that restores the `com.apple.developer.applesignin` entitlement and shows the Apple button. Keep `plugins/with-apple-sign-in-switch.js` listed before `expo-apple-authentication`, since config mods run in reverse registration order.

## Testing

Jest via `jest-expo`, with React Native Testing Library.

- **Never put tests under `app/`.** Expo Router bundles every file in `app/` as a route. Tests live in `test/` or next to the module under `src/` (`*.test.ts` / `*.test.tsx`).
- API tests use the fetch helper in `test/fetch.ts`.
- Every new user-facing string goes in both `src/i18n/locales/en.json` and `src/i18n/locales/uk.json`.

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
