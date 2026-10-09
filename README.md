# HomeAccounting Mobile

The HomeAccounting iOS and Android app, built with Expo and React Native. It talks to the [HomeAccounting backend](https://github.com/homeaccounting/backend); see [tracker#84](https://github.com/homeaccounting/tracker/issues/84) for the plan.

## Prerequisites

- [Nix](https://nixos.org/). `nix develop` provides Node 22, pnpm 10, `just`, Watchman, CocoaPods, JDK 17 and the Android SDK (platform, build tools, NDK, emulator and a system image)
- Xcode, for iOS only. It can't be packaged in a project shell, so install it system-wide (App Store); the maintainers' machines get it from their Nix system config

## Quick start

```bash
nix develop     # or rely on direnv
just install
just ios        # or: just emulator, then just android in another shell
```

The app runs as a dev build, not in Expo Go. Run `just --list` to see every recipe.

## Licence

[AGPL-3.0](LICENSE). Contributions require signing the [CLA](CLA.md); see [CONTRIBUTING.md](CONTRIBUTING.md).
