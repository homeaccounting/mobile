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

The project uses **Nix** to manage development tooling. Run `nix develop` at the start of each session (or rely on `direnv` via `.envrc`). It provides `node`, `pnpm`, `just`, Watchman, CocoaPods (macOS), JDK 17 (`JAVA_HOME`) and the Android SDK (`ANDROID_HOME`: platforms 35 and 36, build tools, NDK, CMake, emulator and system images). Do not install project tooling globally; add it to `flake.nix`. The Android versions in `flake.nix` follow `node_modules/react-native/gradle/libs.versions.toml`; bump them together with the Expo SDK.

The one thing a project shell cannot provide is **Xcode** (licence-bound, not in nixpkgs). Install it system-wide; maintainer machines get it declaratively from the Nix system config (Mac App Store via `mas`). Machine-level settings such as the npm registry also belong in the system config, not in this repo.

Local installs may go through the org npm mirror, so run `just install` (which rewrites the lockfile to public npm URLs) rather than bare `pnpm install`, and never commit a mirror `.npmrc`. The committed `pnpm-lock.yaml` must not contain `wixpress`.

The app runs as a **dev build** (`just ios` / `just android`), not Expo Go. `ios/` and `android/` are generated and gitignored — change native config through `app.json` / config plugins only.

## Common Commands

All commands use `just` (task runner). Run `just --list` to see all recipes.

```bash
just install        # pnpm install + lockfile-fix
just run            # Metro dev server for an installed dev build
just ios            # build and launch on the iOS simulator
just android        # build and launch on an Android emulator/device
just emulator       # create (first run) and start the Android emulator
just typecheck      # tsc --noEmit
just lint           # eslint .
just format         # prettier --write .
just format-check   # prettier --check .
just check          # typecheck + lint + format-check
just test           # jest
just doctor         # expo-doctor
just verify-native  # expo export for ios + android into a temp dir (no simulator needed)
just lockfile-fix   # rewrite private-registry URLs in pnpm-lock.yaml
just clean          # remove node_modules/.expo/ios/android/coverage
```

`just verify-native` is the way to validate native bundling on machines without a simulator. For native config changes, also run `pnpm exec expo prebuild --no-install --clean` (regenerates the gitignored `ios/` and `android/`; run `just clean` afterwards if you don't want them lying around).

## Architecture

```
app/       # Expo Router routes only (_layout.tsx, index.tsx, …)
src/
├── api/   # Typed HTTP client, ported from web and trimmed to the MVP
├── i18n/  # i18next setup; strings in locales/{en,uk}.json
└── lib/   # Utilities (queryClient, …)
test/      # Tests for routes and shared test helpers (fetch.ts)
```

- `src/api` is ported from `web`. Keep the shapes in sync with `web/src/api/types.ts`, which mirrors the backend types.
- Path alias `@/*` → `src/*`.
- `react-native-css-interop` is a direct dependency on purpose, pinned to the version `nativewind` uses. pnpm's strict layout otherwise hides it and Metro cannot resolve NativeWind's `jsx-runtime`. Do not remove it as "unused".

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
