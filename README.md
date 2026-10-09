# HomeAccounting Mobile

The HomeAccounting iOS and Android app, built with Expo and React Native. It talks to the [HomeAccounting backend](https://github.com/homeaccounting/backend); see [tracker#84](https://github.com/homeaccounting/tracker/issues/84) for the plan.

## Prerequisites

- [Nix](https://nixos.org/). `nix develop` provides Node 22, pnpm 10, `just`, Watchman, CocoaPods, JDK 17 and the Android SDK (platforms 35 and 36, build tools, NDK, emulator and system images). The first run downloads several GB, mostly the Android SDK; later runs are fast.
- Xcode, for iOS only. It can't be packaged in a project shell, so install it system-wide (App Store); the maintainers' machines get it from their Nix system config. After installing or updating it, **open Xcode once**: its first-run dialogs accept the licence, install the simulator components and offer the iOS simulator runtime.

## Quick start

```bash
nix develop     # or rely on direnv
just install
just ios        # iOS simulator
# Android: start an emulator first, then build in another shell
just emulator
just android
```

The first `just ios` / `just android` compiles the native project and takes several minutes; after that, JS changes reload instantly.

The app runs as a dev build, not in Expo Go. Run `just --list` to see every recipe.

## Licence

[AGPL-3.0](LICENSE). Contributions require signing the [CLA](CLA.md); see [CONTRIBUTING.md](CONTRIBUTING.md).
